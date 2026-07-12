package com.vanh.event_ticketing.ticket.service;

import com.vanh.event_ticketing.common.exception.BusinessException;
import com.vanh.event_ticketing.common.exception.ErrorCode;
import com.vanh.event_ticketing.common.security.CustomUserDetails;
import com.vanh.event_ticketing.event.entity.TicketType;
import com.vanh.event_ticketing.event.repository.TicketTypeRepository;
import com.vanh.event_ticketing.ticket.dto.ReserveRequest;
import com.vanh.event_ticketing.ticket.dto.TicketResponse;
import com.vanh.event_ticketing.ticket.entity.Ticket;
import com.vanh.event_ticketing.ticket.mapper.TicketMapper;
import com.vanh.event_ticketing.ticket.qr.QrCodeGenerator;
import com.vanh.event_ticketing.ticket.repository.TicketRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketService {
    private static final int RESERVATION_MINUTES = 10;

    private final TicketTypeRepository ticketTypeRepository;
    private final TicketRepository ticketRepository;
    private final TicketMapper ticketMapper;
    private final QrCodeGenerator qrCodeGenerator;

    @Override
    @Transactional
    public TicketResponse reserve(ReserveRequest request, String idempotencyKey, CustomUserDetails userDetails) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new BusinessException(ErrorCode.IDEMPOTENCY_KEY_REQUIRED);
        }
        return ticketRepository.findByCustomerIdAndIdempotencyKey(userDetails.getId(), idempotencyKey)
                .map(ticketMapper::toResponse)
                .orElseGet(() -> reserveNew(request, idempotencyKey, userDetails));
    }

    private TicketResponse reserveNew(ReserveRequest request, String idempotencyKey, CustomUserDetails userDetails) {
        // ponytail: row lock is enough for this single-node MVP; revisit only if reserve throughput becomes a real bottleneck.
        TicketType ticketType = ticketTypeRepository.findWithLockById(request.ticketTypeId()).orElseThrow(() -> new BusinessException(ErrorCode.TICKET_TYPE_NOT_FOUND));
        if (ticketType.getQuantityRemaining() < request.quantity()) {
            throw new BusinessException(ErrorCode.TICKET_SOLD_OUT);
        }
        if (request.quantity() != 1) {
            throw new BusinessException(ErrorCode.ONE_TICKET_PER_RESERVATION);
        }
        Instant now = Instant.now();
        ticketType.setQuantityRemaining(ticketType.getQuantityRemaining() - 1);
        Ticket ticket = new Ticket();
        ticket.setTicketType(ticketType);
        ticket.setCustomer(userDetails.getUser());
        ticket.setIdempotencyKey(idempotencyKey);
        ticket.setReservedAt(now);
        ticket.setExpiresAt(now.plusSeconds(RESERVATION_MINUTES * 60L));
        return ticketMapper.toResponse(ticketRepository.save(ticket));
    }

    @Override
    @Transactional(noRollbackFor = BusinessException.class)
    public TicketResponse confirm(Long id, CustomUserDetails userDetails) {
        Ticket ticket = ownedTicket(id, userDetails);
        if (!"RESERVED".equals(ticket.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_TICKET_STATUS);
        }
        if (ticket.getExpiresAt().isBefore(Instant.now())) {
            expire(ticket);
            throw new BusinessException(ErrorCode.RESERVATION_EXPIRED);
        }
        ticket.setStatus("CONFIRMED");
        ticket.setQrCode(qrCodeGenerator.newCode());
        ticket.setConfirmedAt(Instant.now());
        return ticketMapper.toResponse(ticket);
    }

    @Override
    @Transactional
    public void cancel(Long id, CustomUserDetails userDetails) {
        Ticket ticket = ownedTicket(id, userDetails);
        if (!"RESERVED".equals(ticket.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_TICKET_STATUS);
        }
        expire(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> myTickets(CustomUserDetails userDetails) {
        return ticketRepository.findByCustomerIdOrderByCreatedAtDesc(userDetails.getId()).stream().map(ticketMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public TicketResponse get(Long id, CustomUserDetails userDetails) {
        return ticketMapper.toResponse(ownedTicket(id, userDetails));
    }

    @Override
    @Transactional
    public byte[] qrPng(Long id, CustomUserDetails userDetails) {
        Ticket ticket = ownedTicket(id, userDetails);
        if (ticket.getQrCode() == null || !"CONFIRMED".equals(ticket.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_TICKET_STATUS);
        }
        return qrCodeGenerator.toPng(ticket.getQrCode());
    }

    private Ticket ownedTicket(Long id, CustomUserDetails userDetails) {
        Ticket ticket = ticketRepository.findWithLockById(id).orElseThrow(() -> new BusinessException(ErrorCode.TICKET_NOT_FOUND));
        if (!ticket.getCustomer().getId().equals(userDetails.getId())) {
            throw new BusinessException(ErrorCode.TICKET_OWNERSHIP_VIOLATION);
        }
        return ticket;
    }

    private void expire(Ticket ticket) {
        ticket.setStatus("EXPIRED");
        TicketType ticketType = ticket.getTicketType();
        ticketType.setQuantityRemaining(ticketType.getQuantityRemaining() + 1);
    }
}
