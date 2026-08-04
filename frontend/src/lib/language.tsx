import { createContext, useContext } from 'react'
import type { Role } from '../features/auth/types'

export type Language = 'en' | 'vi'

export const languageNames: Record<Language, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
}

export const copy = {
  en: {
    nav: {
      discover: 'Discover',
      search: 'Search',
      tickets: 'Tickets',
      overview: 'Overview',
      events: 'Events',
      liveOperations: 'Live operations',
      checkIns: 'Check-ins',
      scan: 'Scan',
      history: 'History',
      profile: 'Profile',
      settings: 'Settings',
      account: 'Account',
      explore: 'Explore',
      users: 'Users',
      signIn: 'Sign in',
      signOut: 'Sign out',
    },
    roles: {
      GUEST: 'Guest',
      CUSTOMER: 'Customer',
      ORGANIZER: 'Organizer',
      CHECKIN_STAFF: 'Check-in staff',
      ADMIN: 'Admin',
    } satisfies Record<Role | 'GUEST', string>,
    theme: {
      label: 'Theme',
      description: 'System follows your device preference.',
      light: 'Light theme',
      dark: 'Dark theme',
      switchToLight: 'Switch to light theme',
      switchToDark: 'Switch to dark theme',
    },
    language: {
      label: 'Language',
      description: 'Switch the interface language.',
      switchToEnglish: 'Switch interface language to English',
      switchToVietnamese: 'Switch interface language to Tiếng Việt',
    },
    account: {
      eyebrow: 'Your account',
      profileTitle: 'Profile',
      settingsTitle: 'Settings',
      profileDescription: 'Review the identity and access details attached to this account.',
      settingsDescription: 'Control supported appearance, language, and session preferences.',
      fullName: 'Full name',
      fullNameDescription: 'Profile editing is not supported by the current API.',
      email: 'Email address',
      emailDescription: 'Email changes require verification support from the backend.',
      accountAccess: 'Account access',
      accessDescription: 'Your role controls the workspace and actions available after sign-in.',
      role: 'Role',
      accountId: 'Account ID',
      assignedEvent: 'Assigned event',
      status: 'Status',
      active: 'Active',
      locked: 'Locked',
      appearance: 'Appearance',
      appearanceDescription: 'Choose how Event Ticketing looks on this device.',
      notifications: 'Notifications',
      notificationsDescription: 'Notification preferences will appear when server support is available.',
      notificationsUnavailable: 'No notification preference API is currently exposed, so no switches are shown.',
      security: 'Security and sessions',
      securityDescription: 'End the current authenticated session on this device.',
      currentSession: 'Current session',
      sessionDescription: 'Password changes and multi-session management require backend endpoints.',
    },
    auth: {
      skipToSignIn: 'Skip to sign in',
      eyebrow: 'One account, every moment',
      title: 'From first look to front row.',
      description: 'Reserve tickets, run events, and keep every entrance moving from one carefully designed workspace.',
      proofTickets: 'Attendee-ready tickets',
      proofCheckIn: 'Fast, reliable check-in',
      backToEvents: 'Back to events',
      welcome: 'Welcome',
      modeGroupLabel: 'Authentication mode',
      signInTitle: 'Sign in',
      createAccountTitle: 'Create account',
      introSignIn: 'Continue to your tickets or workspace.',
      introRegister: 'Create a customer account in less than a minute.',
      modeSignIn: 'Sign in',
      modeRegister: 'Register',
      fullName: 'Full name',
      email: 'Email',
      password: 'Password',
      passwordHelp: 'Use at least 8 characters.',
      showValue: 'Show entered value',
      hideValue: 'Hide entered value',
      loading: 'Please wait',
      signInButton: 'Sign in',
      createAccountButton: 'Create account',
      divider: 'or',
      continueWithGoogle: 'Continue with Google',
      googleFailed: 'Google sign-in failed. Try again.',
      googleUnavailable: 'Google sign-in is unavailable.',
      terms: 'By continuing, you agree to use Event Ticketing responsibly and keep your credentials secure.',
      invalidCredentials: 'Email or password is incorrect.',
      registrationFailed: 'Registration failed. Check your details and try again.',
    },
    footerDescription: 'Discovery, reservations, and entry in one calm experience.',
  },
  vi: {
    nav: {
      discover: 'Khám phá',
      search: 'Tìm kiếm',
      tickets: 'Vé',
      overview: 'Tổng quan',
      events: 'Sự kiện',
      liveOperations: 'Vận hành trực tiếp',
      checkIns: 'Soát vé',
      scan: 'Quét vé',
      history: 'Lịch sử',
      profile: 'Hồ sơ',
      settings: 'Cài đặt',
      account: 'Tài khoản',
      explore: 'Khám phá',
      users: 'Người dùng',
      signIn: 'Đăng nhập',
      signOut: 'Đăng xuất',
    },
    roles: {
      GUEST: 'Khách',
      CUSTOMER: 'Khách hàng',
      ORGANIZER: 'Ban tổ chức',
      CHECKIN_STAFF: 'Nhân viên soát vé',
      ADMIN: 'Quản trị viên',
    } satisfies Record<Role | 'GUEST', string>,
    theme: {
      label: 'Giao diện',
      description: 'Hệ thống theo thiết lập của thiết bị.',
      light: 'Giao diện sáng',
      dark: 'Giao diện tối',
      switchToLight: 'Chuyển sang giao diện sáng',
      switchToDark: 'Chuyển sang giao diện tối',
    },
    language: {
      label: 'Ngôn ngữ',
      description: 'Chuyển ngôn ngữ giao diện.',
      switchToEnglish: 'Chuyển ngôn ngữ giao diện sang English',
      switchToVietnamese: 'Chuyển ngôn ngữ giao diện sang Tiếng Việt',
    },
    account: {
      eyebrow: 'Tài khoản của bạn',
      profileTitle: 'Hồ sơ',
      settingsTitle: 'Cài đặt',
      profileDescription: 'Xem lại thông tin định danh và quyền truy cập gắn với tài khoản này.',
      settingsDescription: 'Điều khiển giao diện, ngôn ngữ và phiên đăng nhập được hỗ trợ.',
      fullName: 'Họ và tên',
      fullNameDescription: 'API hiện tại chưa hỗ trợ chỉnh sửa hồ sơ.',
      email: 'Địa chỉ email',
      emailDescription: 'Thay đổi email cần backend hỗ trợ xác minh.',
      accountAccess: 'Quyền truy cập',
      accessDescription: 'Vai trò của bạn quyết định không gian làm việc và thao tác sau đăng nhập.',
      role: 'Vai trò',
      accountId: 'Mã tài khoản',
      assignedEvent: 'Sự kiện được gán',
      status: 'Trạng thái',
      active: 'Đang hoạt động',
      locked: 'Đã khóa',
      appearance: 'Giao diện',
      appearanceDescription: 'Chọn cách Event Ticketing hiển thị trên thiết bị này.',
      notifications: 'Thông báo',
      notificationsDescription: 'Tuỳ chọn thông báo sẽ xuất hiện khi backend hỗ trợ.',
      notificationsUnavailable: 'Hiện chưa có API tuỳ chọn thông báo, nên chưa hiển thị công tắc nào.',
      security: 'Bảo mật và phiên',
      securityDescription: 'Kết thúc phiên đang đăng nhập trên thiết bị này.',
      currentSession: 'Phiên hiện tại',
      sessionDescription: 'Đổi mật khẩu và quản lý nhiều phiên cần các endpoint từ backend.',
    },
    auth: {
      skipToSignIn: 'Bỏ qua và đăng nhập',
      eyebrow: 'Một tài khoản, mọi khoảnh khắc',
      title: 'Từ cái nhìn đầu tiên đến hàng ghế đầu.',
      description: 'Đặt vé, vận hành sự kiện và giữ cho mọi lối vào luôn trôi chảy trong một không gian làm việc được thiết kế gọn gàng.',
      proofTickets: 'Vé sẵn sàng cho khách',
      proofCheckIn: 'Soát vé nhanh và ổn định',
      backToEvents: 'Quay lại sự kiện',
      welcome: 'Chào mừng',
      modeGroupLabel: 'Chế độ xác thực',
      signInTitle: 'Đăng nhập',
      createAccountTitle: 'Tạo tài khoản',
      introSignIn: 'Tiếp tục tới vé hoặc không gian làm việc của bạn.',
      introRegister: 'Tạo tài khoản khách hàng trong chưa tới một phút.',
      modeSignIn: 'Đăng nhập',
      modeRegister: 'Đăng ký',
      fullName: 'Họ và tên',
      email: 'Email',
      password: 'Mật khẩu',
      passwordHelp: 'Dùng ít nhất 8 ký tự.',
      showValue: 'Hiển thị giá trị đã nhập',
      hideValue: 'Ẩn giá trị đã nhập',
      loading: 'Vui lòng chờ',
      signInButton: 'Đăng nhập',
      createAccountButton: 'Tạo tài khoản',
      divider: 'hoặc',
      continueWithGoogle: 'Tiếp tục với Google',
      googleFailed: 'Đăng nhập Google thất bại. Hãy thử lại.',
      googleUnavailable: 'Đăng nhập Google hiện không khả dụng.',
      terms: 'Bằng việc tiếp tục, bạn đồng ý sử dụng Event Ticketing một cách có trách nhiệm và giữ an toàn cho thông tin đăng nhập.',
      invalidCredentials: 'Email hoặc mật khẩu không đúng.',
      registrationFailed: 'Đăng ký thất bại. Hãy kiểm tra lại thông tin và thử lại.',
    },
    footerDescription: 'Khám phá, đặt vé và vào cổng trong một trải nghiệm gọn gàng.',
  },
} as const

type LanguageCopy = (typeof copy)[Language]

export const languageStorageKey = 'event-ticketing-language'

export interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export function useLanguageCopy(): LanguageCopy {
  const { language } = useLanguage()
  return copy[language]
}
