package com.vanh.event_ticketing.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid Credentials", "Email hoac mat khau khong dung."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid Refresh Token", "Phien dang nhap khong hop le hoac da het han."),
    REFRESH_TOKEN_REUSE_DETECTED(HttpStatus.UNAUTHORIZED, "Refresh Token Reuse Detected", "Phien dang nhap khong an toan, vui long dang nhap lai."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "Email Already Exists", "Email da duoc dang ky."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "User Not Found", "Khong tim thay nguoi dung."),
    USER_INACTIVE(HttpStatus.FORBIDDEN, "User Inactive", "Tai khoan da bi khoa."),
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Event Not Found", "Khong tim thay su kien."),
    EVENT_OWNERSHIP_VIOLATION(HttpStatus.FORBIDDEN, "Event Ownership Violation", "Ban khong co quyen thao tac su kien nay."),
    INVALID_EVENT_TIME(HttpStatus.BAD_REQUEST, "Invalid Event Time", "Thoi gian ket thuc phai sau thoi gian bat dau."),
    INVALID_BANNER_FILE(HttpStatus.BAD_REQUEST, "Invalid Banner File", "Banner phai la anh PNG/JPEG va toi da 5MB."),
    TICKET_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "Ticket Type Not Found", "Khong tim thay loai ve."),
    TICKET_NOT_FOUND(HttpStatus.NOT_FOUND, "Ticket Not Found", "Khong tim thay ve."),
    TICKET_SOLD_OUT(HttpStatus.CONFLICT, "Ticket Sold Out", "Loai ve khong con du so luong yeu cau."),
    IDEMPOTENCY_KEY_REQUIRED(HttpStatus.BAD_REQUEST, "Idempotency Key Required", "Header Idempotency-Key la bat buoc."),
    ONE_TICKET_PER_RESERVATION(HttpStatus.BAD_REQUEST, "One Ticket Per Reservation", "MVP hien chi ho tro giu 1 ve moi request."),
    INVALID_TICKET_STATUS(HttpStatus.CONFLICT, "Invalid Ticket Status", "Trang thai ve khong hop le cho thao tac nay."),
    RESERVATION_EXPIRED(HttpStatus.CONFLICT, "Reservation Expired", "Thoi gian giu cho da het han, vui long dat lai."),
    TICKET_OWNERSHIP_VIOLATION(HttpStatus.FORBIDDEN, "Ticket Ownership Violation", "Ban khong co quyen xem ve nay."),
    TICKET_ALREADY_CHECKED_IN(HttpStatus.CONFLICT, "Ticket Already Checked In", "Ve nay da duoc check-in truoc do."),
    GATE_NOT_FOUND(HttpStatus.NOT_FOUND, "Gate Not Found", "Khong tim thay cong check-in."),
    CHECKIN_GATE_EVENT_MISMATCH(HttpStatus.BAD_REQUEST, "Check-in Gate Event Mismatch", "Cong check-in khong thuoc su kien cua ve."),
    CHECKIN_STAFF_EVENT_MISMATCH(HttpStatus.FORBIDDEN, "Check-in Staff Event Mismatch", "Nhan vien khong duoc gan vao su kien nay."),
    GOOGLE_AUTH_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "Google Auth Not Configured", "Google authentication chua duoc cau hinh cho moi truong nay."),
    INVALID_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "Invalid Google Token", "Google ID token khong hop le."),
    EXPIRED_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "Expired Google Token", "Google ID token da het han."),
    GOOGLE_CLIENT_ID_MISMATCH(HttpStatus.UNAUTHORIZED, "Google Client ID Mismatch", "Google ID token khong duoc cap cho ung dung nay."),
    GOOGLE_EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "Google Email Not Verified", "Email Google chua duoc xac minh."),
    GOOGLE_ACCOUNT_CONFLICT(HttpStatus.CONFLICT, "Google Account Conflict", "Google account bi xung dot voi tai khoan da ton tai."),
    GOOGLE_TOKEN_VERIFICATION_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "Google Token Verification Failed", "Khong the xac minh Google ID token luc nay.");

    private final HttpStatus httpStatus;
    private final String title;
    private final String defaultMessage;

    ErrorCode(HttpStatus httpStatus, String title, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.title = title;
        this.defaultMessage = defaultMessage;
    }

}
