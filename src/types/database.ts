export type UserRole = 'admin' | 'hr_manager' | 'manager' | 'employee' | 'new_hire'
export type EmploymentStatus = 'active' | 'inactive' | 'terminated' | 'on_leave' | 'onboarding'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'per_diem' | 'temporary'
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue'
export interface Department { id: string; name: string; description: string | null; sort_order: number; is_active: boolean }
export interface Role { id: string; title: string; department_id: string | null; is_multi_department: boolean; employment_type: EmploymentType; requires_nursing_license: boolean; requires_cpr_cert: boolean; requires_tb_test: boolean; requires_background_check: boolean; department?: Department }
export interface Employee { id: string; first_name: string; last_name: string; email: string; phone: string | null; employee_number: string | null; department_id: string | null; role_id: string | null; supervisor_id: string | null; user_role: UserRole; employment_status: EmploymentStatus; hire_date: string | null; avatar_url: string | null; onboarding_status: OnboardingStatus; department?: Department; role?: Role }
