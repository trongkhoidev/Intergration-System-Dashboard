import { Navigate } from 'react-router-dom';

// ResetPassword giờ được tích hợp vào ForgotPassword (flow 3 bước)
// File này chỉ redirect để tránh lỗi nếu ai đó truy cập URL cũ
export default function ResetPassword() {
  return <Navigate to="/forgot-password" replace />;
}
