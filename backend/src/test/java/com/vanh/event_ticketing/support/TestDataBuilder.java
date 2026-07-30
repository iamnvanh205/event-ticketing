package com.vanh.event_ticketing.support;

import com.vanh.event_ticketing.auth.entity.Role;
import com.vanh.event_ticketing.auth.entity.AuthProvider;
import com.vanh.event_ticketing.auth.entity.User;
import com.vanh.event_ticketing.event.entity.Event;
import com.vanh.event_ticketing.event.entity.TicketType;
import com.vanh.event_ticketing.gate.entity.Gate;
import com.vanh.event_ticketing.ticket.entity.Ticket;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class TestDataBuilder {
    private TestDataBuilder() {
    }

    public static Role role(String name) {
        Role role = new Role();
        role.setName(name);
        return role;
    }

    public static User user(Role role) {
        User user = new User();
        user.setEmail(UUID.randomUUID() + "@test.local");
        user.setFullName("Test " + role.getName());
        user.setPasswordHash("test");
        user.setProvider(AuthProvider.LOCAL);
        user.setRole(role);
        user.setActive(true);
        return user;
    }

    public static Event event(User organizer) {
        Event event = new Event();
        event.setOrganizer(organizer);
        event.setName("Test Event " + UUID.randomUUID());
        event.setLocation("Test Hall");
        event.setStartTime(Instant.now().plusSeconds(3600));
        event.setEndTime(Instant.now().plusSeconds(7200));
        event.setStatus("PUBLISHED");
        return event;
    }

    public static TicketType ticketType(Event event, int remaining) {
        TicketType ticketType = new TicketType();
        ticketType.setEvent(event);
        ticketType.setName("Standard");
        ticketType.setPrice(new BigDecimal("100000"));
        ticketType.setQuantityTotal(remaining);
        ticketType.setQuantityRemaining(remaining);
        return ticketType;
    }

    public static Gate gate(Event event) {
        Gate gate = new Gate();
        gate.setEvent(event);
        gate.setName("Gate A");
        return gate;
    }

    public static Ticket confirmedTicket(TicketType ticketType, User customer) {
        Instant now = Instant.now();
        Ticket ticket = new Ticket();
        ticket.setTicketType(ticketType);
        ticket.setCustomer(customer);
        ticket.setQrCode(UUID.randomUUID().toString());
        ticket.setStatus("CONFIRMED");
        ticket.setIdempotencyKey(UUID.randomUUID().toString());
        ticket.setReservedAt(now.minusSeconds(60));
        ticket.setExpiresAt(now.plusSeconds(600));
        ticket.setConfirmedAt(now);
        return ticket;
    }
}
