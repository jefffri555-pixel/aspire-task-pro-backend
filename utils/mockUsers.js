const MOCK_USERS = {
  'admin@aspire.com': {
    id: 'admin_1',
    employee_id: 'EMP-1000',
    name: 'Administrator',
    email: 'admin@aspire.com',
    phone: '9999999999',
    role: 'admin',
    designation: 'Super Admin',
    department_id: 'dept_admin',
    department_name: 'Founder',
    joining_date: '2024-01-01',
    performance_score: 100.00,
    password_plain: 'password123'
  },
  'manager@aspire.com': {
    id: 'mgr_1',
    employee_id: 'EMP-1001',
    name: 'Vivek Ravichandran',
    email: 'manager@aspire.com',
    phone: '+919698871715',
    role: 'manager',
    designation: 'General Manager',
    department_id: 'dept_admin',
    department_name: 'Founder',
    joining_date: '2024-01-15',
    performance_score: 98.50,
    password_plain: 'password123'
  },
  'tl@aspire.com': {
    id: 'tl_1',
    employee_id: 'EMP-1002',
    name: 'Karthi',
    email: 'tl@aspire.com',
    phone: '+918825878193',
    role: 'team_leader',
    designation: 'Digital Marketing Team Leader',
    department_id: 'Digital Marketing',
    department_name: 'Digital Marketing',
    joining_date: '2024-06-10',
    reporting_manager_id: 'mgr_1',
    performance_score: 92.00,
    password_plain: 'Karthi05'
  },
  'staff@aspire.com': {
    id: 'staff_1',
    employee_id: 'EMP-1003',
    name: 'Rashiban',
    email: 'staff@aspire.com',
    phone: '+917397512447',
    role: 'staff',
    designation: 'Performance Marketer',
    department_id: 'Performance Marketer',
    department_name: 'Digital Marketing',
    joining_date: '2025-01-10',
    reporting_manager_id: 'mgr_1',
    team_leader_id: 'tl_1',
    performance_score: 88.00,
    password_plain: 'password123'
  }
};

module.exports = {
  MOCK_USERS
};
