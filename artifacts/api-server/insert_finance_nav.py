import re

with open('D:/Senior-Architect/Senior-Architect/artifacts/erp/src/components/layout/app-layout.tsx', 'rb') as f:
    content = f.read()

finance_jsx = (
    "          {/* Finance Module - Collapsible */}\r\n"
    "          <div className=\"mb-6\">\r\n"
    "            <button\r\n"
    "              onClick={() => {\r\n"
    "                const next = !isFinanceOpen;\r\n"
    "                setIsFinanceOpen(next);\r\n"
    "                try { localStorage.setItem('finance_section_open', String(next)); } catch {}\r\n"
    "              }}\r\n"
    "              className=\"w-full flex items-center justify-between px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors\"\r\n"
    "            >\r\n"
    "              <span>Finance</span>\r\n"
    "              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isFinanceOpen ? 'rotate-0' : '-rotate-90'}`} />\r\n"
    "            </button>\r\n"
    "            {isFinanceOpen && (\r\n"
    "              <ul className=\"space-y-1\">\r\n"
    "                {[\r\n"
    "                  { name: 'Dashboard',       path: '/finance/dashboard',  icon: PiggyBank },\r\n"
    "                  { name: 'Accounts Master', path: '/finance/accounts',   icon: Building2 },\r\n"
    "                  { name: 'Account Ledger',  path: '/finance/ledger',     icon: BookOpen },\r\n"
    "                  { name: 'Transfers',       path: '/finance/transfers',  icon: ArrowLeftRight },\r\n"
    "                  { name: 'Expenses',        path: '/finance/expenses',   icon: Receipt },\r\n"
    "                  { name: 'Salary',          path: '/finance/salary',     icon: UserCheck },\r\n"
    "                  { name: 'Payments',        path: '/payments',           icon: CreditCard },\r\n"
    "                  { name: 'Reports',         path: '/finance/reports',    icon: BarChart3 },\r\n"
    "                  { name: 'Audit Logs',      path: '/finance/audit-logs', icon: ClipboardList },\r\n"
    "                ].map((item) => {\r\n"
    "                  const Icon = item.icon;\r\n"
    "                  const isActive = location === item.path || (item.path !== '/payments' && location.startsWith(item.path + '/'));\r\n"
    "                  return (\r\n"
    "                    <li key={item.path}>\r\n"
    "                      <button\r\n"
    "                        onClick={() => { setLocation(item.path); setIsMobileMenuOpen(false); }}\r\n"
    "                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${\r\n"
    "                          isActive ? 'bg-primary/10 text-primary font-medium rtl:border-r-4 ltr:border-l-4 border-primary'\r\n"
    "                                   : 'text-sidebar-foreground hover:bg-sidebar-accent rtl:border-r-4 ltr:border-l-4 border-transparent'\r\n"
    "                        }`}\r\n"
    "                      >\r\n"
    "                        <Icon className={`w-4 h-4 mr-3 rtl:ml-3 rtl:mr-0 shrink-0 ${isActive ? 'text-primary' : ''}`} />\r\n"
    "                        <span className=\"truncate\">{item.name}</span>\r\n"
    "                      </button>\r\n"
    "                    </li>\r\n"
    "                  );\r\n"
    "                })}\r\n"
    "              </ul>\r\n"
    "            )}\r\n"
    "          </div>\r\n"
)

finance_bytes = finance_jsx.encode('utf-8')

old = b'          ))}\r\n        </div>\r\n      </aside>'
new = b'          ))}\r\n\r\n' + finance_bytes + b'\r\n        </div>\r\n      </aside>'
result = content.replace(old, new, 1)

with open('D:/Senior-Architect/Senior-Architect/artifacts/erp/src/components/layout/app-layout.tsx', 'wb') as f:
    f.write(result)

print('Done, replaced:', old in content, 'new length:', len(result))
