import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserRole,
  Profile,
  BankAccount,
  Loan,
  LoanCollectionEntry,
  TopUpEntry,
  ChitScheme,
  ChitGroup,
  ChitMember,
  AuctionRecord,
  ParentProperty,
  ChildProperty,
  RentalAgreement,
  RentCollection,
  RentalDue,
  RentalSettlement,
  RentalSettlementPayment,
  TenantAllocationInput,
  AgreementRenewalInput,
  RentalPaymentInput,
  OccupancyExitInput,
  ActionResult,
  ExpenseCategory,
  ExpenseRecord,
  InvestmentRecord,
  ReceivableItem,
  PayableItem,
  CashBookEntry,
  BankBookEntry,
  CentralLedgerEntry,
  DocumentItem,
  AuditLogEntry,
  NotificationItem,
  MasterDataConfig,
  PaymentMode,
  TransactionClassification,
} from '../types';

import {
  INITIAL_PROFILES,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_LOANS,
  INITIAL_CHIT_SCHEMES,
  INITIAL_CHIT_GROUPS,
  INITIAL_CHIT_MEMBERS,
  INITIAL_PARENT_PROPERTIES,
  INITIAL_CHILD_PROPERTIES,
  INITIAL_AGREEMENTS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_INVESTMENTS,
  INITIAL_RECEIVABLES,
  INITIAL_PAYABLES,
  INITIAL_CASH_BOOK,
  INITIAL_BANK_BOOK,
  INITIAL_CENTRAL_LEDGER,
  INITIAL_DOCUMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_MASTER_DATA,
} from '../mock/initialData';
import {
  RENTAL_EXPENSE_CATEGORIES,
  buildMissingDues,
  allocatePayment,
  dueOutstanding,
  monthOf,
  occupancyKey,
  dueDateFor,
} from '../utils/rentalUtils';

interface CTETransactionPayload {
  amount: number;
  direction: 'receipt' | 'payment';
  mode: PaymentMode;
  bankAccountId?: string;
  classification: TransactionClassification;
  sourceModule: 'Finance' | 'Chit Fund' | 'Rental' | 'Expense' | 'Investment' | 'Receivables & Payables' | 'General';
  sourceRecordId: string;
  partyName: string;
  description: string;
  remarks?: string;
  /** Transaction date (YYYY-MM-DD); defaults to today. */
  date?: string;
}

interface ERPContextType {
  // Authentication & RBAC
  isAuthenticated: boolean;
  currentUser: { username: string; name: string; role: UserRole; email?: string } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  userRole: UserRole;
  userName: string;
  setUserRole: (role: UserRole) => void;
  toggleRole: () => void;
  isTelegramVerified: boolean;
  verifyTelegramOtp: (otp: string) => boolean;

  // Master Data
  masterData: MasterDataConfig;
  updateMasterData: (newData: Partial<MasterDataConfig>) => void;

  // Profiles
  profiles: Profile[];
  createProfile: (data: Omit<Profile, 'id' | 'createdAt'>) => Profile;
  updateProfile: (id: string, data: Partial<Profile>) => boolean;
  getProfileById: (id?: string) => Profile | undefined;

  // Central Financial Core
  bankAccounts: BankAccount[];
  cashBook: CashBookEntry[];
  bankBook: BankBookEntry[];
  centralLedger: CentralLedgerEntry[];
  totalCashBalance: number;
  totalBankBalance: number;
  postCentralTransaction: (payload: CTETransactionPayload) => void;
  updateBankAccount: (id: string, data: Partial<BankAccount>) => boolean;
  addBankAccount: (data: Omit<BankAccount, 'id' | 'currentBalance'>) => BankAccount;
  reverseTransaction: (module: string, recordId: string, reason: string) => boolean;

  // Finance Module
  loans: Loan[];
  createLoanApplication: (data: Partial<Loan>) => Loan;
  updateLoan: (id: string, data: Partial<Loan>) => boolean;
  sanctionLoan: (loanId: string, remarks: string) => boolean;
  rejectLoan: (loanId: string, remarks: string) => boolean;
  disburseLoan: (loanId: string, mode: PaymentMode, bankAccountId?: string) => boolean;
  collectLoanPayment: (loanId: string, payload: {
    principal: number;
    officialInterest: number;
    nonAccountedInterest: number;
    penalty: number;
    otherCharges: number;
    mode: PaymentMode;
    bankAccountId?: string;
    remarks?: string;
  }) => string; // returns receiptNumber
  topUpLoan: (loanId: string, amount: number, mode: PaymentMode, bankAccountId?: string, remarks?: string) => boolean;
  closeLoan: (loanId: string) => boolean;

  // Chit Fund Module
  chitSchemes: ChitScheme[];
  chitGroups: ChitGroup[];
  chitMembers: ChitMember[];
  auctionRecords: AuctionRecord[];
  createChitScheme: (data: Omit<ChitScheme, 'id'>) => ChitScheme;
  updateChitScheme: (id: string, data: Partial<ChitScheme>) => boolean;
  deleteChitScheme: (id: string) => boolean;
  createChitGroup: (data: Partial<ChitGroup>) => ChitGroup;
  updateChitGroup: (id: string, data: Partial<ChitGroup>) => boolean;
  activateChitGroup: (groupId: string) => boolean;
  enrollChitMember: (groupId: string, profileId: string) => boolean;
  collectChitInstallment: (memberId: string, amount: number, penalty: number, mode: PaymentMode, bankAccountId?: string) => string;
  recordAuctionWinner: (groupId: string, winnerProfileId: string, bidPrize: number, mode: PaymentMode, bankAccountId?: string) => boolean;
  closeChitGroup: (groupId: string) => boolean;

  // Rental Module
  parentProperties: ParentProperty[];
  childProperties: ChildProperty[];
  rentalAgreements: RentalAgreement[];
  rentCollections: RentCollection[];
  rentalDues: RentalDue[];
  rentalSettlements: RentalSettlement[];
  allocateTenant: (data: TenantAllocationInput) => ActionResult;
  uploadAgreementDocument: (agreementId: string, fileName: string, fileSize: string) => void;
  renewAgreement: (agreementId: string, data: AgreementRenewalInput) => ActionResult;
  collectRentalPayment: (data: RentalPaymentInput) => ActionResult;
  exitOccupancy: (agreementId: string, data: OccupancyExitInput) => ActionResult;
  confirmHandover: (settlementId: string) => ActionResult;
  recordSettlementPayment: (settlementId: string, payment: Omit<RentalSettlementPayment, 'direction'>) => ActionResult;
  createParentProperty: (data: Partial<ParentProperty>) => ParentProperty;
  createProperty: (data: Partial<ChildProperty>) => void;
  updateParentProperty: (id: string, data: Partial<ParentProperty>) => boolean;
  deleteParentProperty: (id: string) => boolean;
  updateChildProperty: (id: string, data: Partial<ChildProperty>) => boolean;
  deleteChildProperty: (id: string) => boolean;
  createRentalAgreement: (data: Omit<RentalAgreement, 'id' | 'status'>) => void;
  updateRentalAgreement: (id: string, data: Partial<RentalAgreement>) => boolean;
  reviseRent: (agreementId: string, newRentAmount: number, newMaintenanceAmount?: number) => boolean;
  renewLease: (agreementId: string, newEndDate: string, newRentAmount?: number) => boolean;
  collectRent: (agreementId: string, rentAmount: number, maintenanceAmount: number, mode: PaymentMode, bankAccountId?: string) => string;
  closeLease: (agreementId: string) => void;

  // Expense Module
  expenseCategories: ExpenseCategory[];
  expenses: ExpenseRecord[];
  createExpenseCategory: (name: string) => ExpenseCategory;
  updateExpenseCategory: (id: string, name: string) => boolean;
  recordExpense: (data: Omit<ExpenseRecord, 'id' | 'postedAt' | 'enteredBy'>) => string;

  // Investment Module
  investments: InvestmentRecord[];
  recordInvestment: (data: Omit<InvestmentRecord, 'id' | 'totalInstalmentsPaid'>) => void;
  updateInvestment: (id: string, data: Partial<InvestmentRecord>) => boolean;
  payInvestmentInstalment: (investmentId: string, amount: number, mode: PaymentMode, bankAccountId?: string) => void;
  closeInvestment: (investmentId: string, finalAmount: number, mode: PaymentMode, bankAccountId?: string) => void;

  // Receivables & Payables Module
  receivables: ReceivableItem[];
  payables: PayableItem[];
  recordReceivable: (data: Omit<ReceivableItem, 'id' | 'accruedPenalty' | 'totalDue' | 'paidAmount' | 'balanceOutstanding' | 'status' | 'createdAt'>) => void;
  updateReceivable: (id: string, data: Partial<ReceivableItem>) => boolean;
  recordReceivablePayment: (id: string, amount: number, mode: PaymentMode, bankAccountId?: string) => void;
  recordPayable: (data: Omit<PayableItem, 'id' | 'paidAmount' | 'balanceOutstanding' | 'status' | 'createdAt'>) => void;
  updatePayable: (id: string, data: Partial<PayableItem>) => boolean;
  recordPayablePayment: (id: string, amount: number, mode: PaymentMode, bankAccountId?: string) => void;

  // Shared Services: Documents, Audit, Notifications
  documents: DocumentItem[];
  uploadDocument: (doc: Omit<DocumentItem, 'id' | 'uploadedAt' | 'uploadedBy'>) => void;
  deleteDocument: (docId: string) => boolean;
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  sendTelegramSimulatedAlert: (title: string, message: string, module: string) => void;

  // Reset demo data
  resetAllData: () => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Role State
  const [userRoleState, setUserRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('pbms_role') as UserRole) || 'admin';
  });
  const [isTelegramVerified, setIsTelegramVerified] = useState<boolean>(true);

  // Data Collections with LocalStorage hydration
  const [masterData, setMasterData] = useState<MasterDataConfig>(() => {
    const saved = localStorage.getItem('pbms_master_data');
    return saved ? JSON.parse(saved) : INITIAL_MASTER_DATA;
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('pbms_profiles');
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('pbms_bank_accounts');
    return saved ? JSON.parse(saved) : INITIAL_BANK_ACCOUNTS;
  });

  const [cashBook, setCashBook] = useState<CashBookEntry[]>(() => {
    const saved = localStorage.getItem('pbms_cash_book');
    return saved ? JSON.parse(saved) : INITIAL_CASH_BOOK;
  });

  const [bankBook, setBankBook] = useState<BankBookEntry[]>(() => {
    const saved = localStorage.getItem('pbms_bank_book');
    return saved ? JSON.parse(saved) : INITIAL_BANK_BOOK;
  });

  const [centralLedger, setCentralLedger] = useState<CentralLedgerEntry[]>(() => {
    const saved = localStorage.getItem('pbms_central_ledger');
    return saved ? JSON.parse(saved) : INITIAL_CENTRAL_LEDGER;
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('pbms_loans');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [chitSchemes, setChitSchemes] = useState<ChitScheme[]>(() => {
    const saved = localStorage.getItem('pbms_chit_schemes');
    return saved ? JSON.parse(saved) : INITIAL_CHIT_SCHEMES;
  });

  const [chitGroups, setChitGroups] = useState<ChitGroup[]>(() => {
    const saved = localStorage.getItem('pbms_chit_groups');
    return saved ? JSON.parse(saved) : INITIAL_CHIT_GROUPS;
  });

  const [chitMembers, setChitMembers] = useState<ChitMember[]>(() => {
    const saved = localStorage.getItem('pbms_chit_members');
    return saved ? JSON.parse(saved) : INITIAL_CHIT_MEMBERS;
  });

  const [auctionRecords, setAuctionRecords] = useState<AuctionRecord[]>(() => {
    const saved = localStorage.getItem('pbms_auction_records');
    return saved ? JSON.parse(saved) : [];
  });

  const [parentProperties, setParentProperties] = useState<ParentProperty[]>(() => {
    const saved = localStorage.getItem('pbms_parent_properties');
    return saved ? JSON.parse(saved) : INITIAL_PARENT_PROPERTIES;
  });

  const [childProperties, setChildProperties] = useState<ChildProperty[]>(() => {
    const saved = localStorage.getItem('pbms_child_properties');
    return saved ? JSON.parse(saved) : INITIAL_CHILD_PROPERTIES;
  });

  const [rentalAgreements, setRentalAgreements] = useState<RentalAgreement[]>(() => {
    const saved = localStorage.getItem('pbms_rental_agreements');
    return saved ? JSON.parse(saved) : INITIAL_AGREEMENTS;
  });

  const [rentCollections, setRentCollections] = useState<RentCollection[]>(() => {
    const saved = localStorage.getItem('pbms_rent_collections');
    return saved ? JSON.parse(saved) : [];
  });

  const [rentalDues, setRentalDues] = useState<RentalDue[]>(() => {
    const saved = localStorage.getItem('pbms_rental_dues');
    return saved ? JSON.parse(saved) : [];
  });

  const [rentalSettlements, setRentalSettlements] = useState<RentalSettlement[]>(() => {
    const saved = localStorage.getItem('pbms_rental_settlements');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem('pbms_expense_categories');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CATEGORIES;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem('pbms_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [investments, setInvestments] = useState<InvestmentRecord[]>(() => {
    const saved = localStorage.getItem('pbms_investments');
    return saved ? JSON.parse(saved) : INITIAL_INVESTMENTS;
  });

  const [receivables, setReceivables] = useState<ReceivableItem[]>(() => {
    const saved = localStorage.getItem('pbms_receivables');
    return saved ? JSON.parse(saved) : INITIAL_RECEIVABLES;
  });

  const [payables, setPayables] = useState<PayableItem[]>(() => {
    const saved = localStorage.getItem('pbms_payables');
    return saved ? JSON.parse(saved) : INITIAL_PAYABLES;
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('pbms_documents');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('pbms_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('pbms_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // Sync to local storage
  useEffect(() => { localStorage.setItem('pbms_role', userRoleState); }, [userRoleState]);
  useEffect(() => { localStorage.setItem('pbms_profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('pbms_bank_accounts', JSON.stringify(bankAccounts)); }, [bankAccounts]);
  useEffect(() => { localStorage.setItem('pbms_cash_book', JSON.stringify(cashBook)); }, [cashBook]);
  useEffect(() => { localStorage.setItem('pbms_bank_book', JSON.stringify(bankBook)); }, [bankBook]);
  useEffect(() => { localStorage.setItem('pbms_central_ledger', JSON.stringify(centralLedger)); }, [centralLedger]);
  useEffect(() => { localStorage.setItem('pbms_loans', JSON.stringify(loans)); }, [loans]);
  useEffect(() => { localStorage.setItem('pbms_chit_groups', JSON.stringify(chitGroups)); }, [chitGroups]);
  useEffect(() => { localStorage.setItem('pbms_chit_members', JSON.stringify(chitMembers)); }, [chitMembers]);
  useEffect(() => { localStorage.setItem('pbms_auction_records', JSON.stringify(auctionRecords)); }, [auctionRecords]);
  useEffect(() => { localStorage.setItem('pbms_parent_properties', JSON.stringify(parentProperties)); }, [parentProperties]);
  useEffect(() => { localStorage.setItem('pbms_child_properties', JSON.stringify(childProperties)); }, [childProperties]);
  useEffect(() => { localStorage.setItem('pbms_rental_agreements', JSON.stringify(rentalAgreements)); }, [rentalAgreements]);
  useEffect(() => { localStorage.setItem('pbms_rent_collections', JSON.stringify(rentCollections)); }, [rentCollections]);
  useEffect(() => { localStorage.setItem('pbms_rental_dues', JSON.stringify(rentalDues)); }, [rentalDues]);
  useEffect(() => { localStorage.setItem('pbms_rental_settlements', JSON.stringify(rentalSettlements)); }, [rentalSettlements]);

  // Rental: generate any missing monthly dues (idempotent, so renewals/reloads never duplicate them)
  useEffect(() => {
    const missing = buildMissingDues(rentalAgreements, rentalDues);
    if (missing.length > 0) setRentalDues(prev => [...prev, ...missing]);
  }, [rentalAgreements, rentalDues]);

  // Rental: make sure the property-expense categories exist in the shared expense category master
  useEffect(() => {
    const missing = RENTAL_EXPENSE_CATEGORIES.filter(c => !expenseCategories.some(e => e.id === c.id));
    if (missing.length > 0) setExpenseCategories(prev => [...prev, ...missing]);
  }, [expenseCategories]);

  useEffect(() => { localStorage.setItem('pbms_expense_categories', JSON.stringify(expenseCategories)); }, [expenseCategories]);
  useEffect(() => { localStorage.setItem('pbms_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('pbms_investments', JSON.stringify(investments)); }, [investments]);
  useEffect(() => { localStorage.setItem('pbms_receivables', JSON.stringify(receivables)); }, [receivables]);
  useEffect(() => { localStorage.setItem('pbms_payables', JSON.stringify(payables)); }, [payables]);
  useEffect(() => { localStorage.setItem('pbms_documents', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('pbms_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('pbms_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('pbms_master_data', JSON.stringify(masterData)); }, [masterData]);

  // Derived Financial Balances
  const totalCashBalance = cashBook.length > 0 ? cashBook[cashBook.length - 1].runningBalance : 0;
  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

  // User Session State
  const [currentUser, setCurrentUser] = useState<{ username: string; name: string; role: UserRole; email?: string } | null>(() => {
    const saved = localStorage.getItem('pbms_user_session');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const isAuthenticated = currentUser !== null;
  const userRole: UserRole = currentUser?.role || (localStorage.getItem('pbms_role') as UserRole) || 'admin';
  const userName = currentUser?.name || (userRole === 'admin' ? 'Administrator (Dhavanam)' : 'Employee (Karthik)');

  const login = (usernameInput: string, passwordInput: string): boolean => {
    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim();

    if ((u === 'admin' || u === 'admin@dhavanam.com') && (p === 'admin123' || p === 'admin')) {
      const user = { username: 'admin', name: 'Administrator (Dhavanam)', role: 'admin' as UserRole, email: 'admin@dhavanam.com' };
      setCurrentUser(user);
      setUserRoleState('admin');
      localStorage.setItem('pbms_user_session', JSON.stringify(user));
      localStorage.setItem('pbms_role', 'admin');
      addAuditLog('LOGIN_SUCCESS', 'Platform', 'User', 'admin', 'User admin signed into PBMS ERP');
      return true;
    }

    if ((u === 'karthik' || u === 'emp' || u === 'employee' || u === 'karthik@dhavanam.com') && (p === 'emp123' || p === 'employee' || p === '123456')) {
      const user = { username: 'karthik', name: 'Employee (Karthik)', role: 'employee' as UserRole, email: 'karthik@dhavanam.com' };
      setCurrentUser(user);
      setUserRoleState('employee');
      localStorage.setItem('pbms_user_session', JSON.stringify(user));
      localStorage.setItem('pbms_role', 'employee');
      addAuditLog('LOGIN_SUCCESS', 'Platform', 'User', 'karthik', 'User karthik signed into PBMS ERP');
      return true;
    }

    if (u && p) {
      const user = { username: u, name: u.charAt(0).toUpperCase() + u.slice(1), role: 'employee' as UserRole };
      setCurrentUser(user);
      setUserRoleState('employee');
      localStorage.setItem('pbms_user_session', JSON.stringify(user));
      localStorage.setItem('pbms_role', 'employee');
      addAuditLog('LOGIN_SUCCESS', 'Platform', 'User', u, `User ${u} signed into PBMS ERP`);
      return true;
    }

    addAuditLog('LOGIN_FAILED', 'Platform', 'User', u || 'unknown', `Failed login attempt for ${usernameInput}`);
    return false;
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('LOGOUT', 'Platform', 'User', currentUser.username, `User ${currentUser.username} logged out`);
    }
    setCurrentUser(null);
    localStorage.removeItem('pbms_user_session');
  };

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    addAuditLog('SWITCH_ROLE', 'Platform', 'User', role, `Switched active role to ${role}`);
  };

  const toggleRole = () => {
    const next = userRole === 'admin' ? 'employee' : 'admin';
    setUserRole(next);
  };

  const verifyTelegramOtp = (otp: string): boolean => {
    if (otp === '123456' || otp.length === 6) {
      setIsTelegramVerified(true);
      return true;
    }
    return false;
  };

  const updateMasterData = (newData: Partial<MasterDataConfig>) => {
    if (userRole !== 'admin') {
      alert('Restricted: Master Data modifications require Administrator role.');
      return;
    }
    setMasterData(prev => ({ ...prev, ...newData }));
    addAuditLog('UPDATE_MASTER_DATA', 'Platform', 'MasterData', 'CONFIG', 'Updated system master data configurations');
  };

  // Helper to add audit log
  const addAuditLog = (
    action: string,
    module: string,
    entityType: string,
    entityId: string,
    details: string,
    beforeValues?: string,
    afterValues?: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      actorName: userName,
      actorRole: userRole,
      action,
      module,
      entityType,
      entityId,
      details,
      beforeValues,
      afterValues,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Helper to send simulated notification
  const sendNotification = (
    title: string,
    message: string,
    module: string,
    type: NotificationItem['type'],
    channel: 'telegram' | 'system' = 'telegram'
  ) => {
    const newNotification: NotificationItem = {
      id: `NOT-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      title,
      message,
      channel,
      module,
      type,
      isRead: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const sendTelegramSimulatedAlert = (title: string, message: string, module: string) => {
    sendNotification(title, message, module, 'due_reminder', 'telegram');
  };

  // =========================================================================
  // CENTRAL FINANCIAL TRANSACTION ENGINE (CTE) - THE CORE POSTING PIPELINE
  // =========================================================================
  const postCentralTransaction = (payload: CTETransactionPayload) => {
    const now = new Date().toISOString();
    const today = payload.date || now.slice(0, 10);
    const multiplier = payload.direction === 'receipt' ? 1 : -1;

    // 1. Post to Cash Book if Cash
    if (payload.mode === 'cash') {
      const prevCashBal = cashBook.length > 0 ? cashBook[cashBook.length - 1].runningBalance : 0;
      const newCashBal = prevCashBal + (payload.amount * multiplier);

      const cashEntry: CashBookEntry = {
        id: `CB-${Date.now().toString().slice(-6)}`,
        date: today,
        amount: payload.amount,
        direction: payload.direction,
        classification: payload.classification,
        sourceModule: payload.sourceModule,
        sourceRecordId: payload.sourceRecordId,
        partyName: payload.partyName,
        enteredBy: userName,
        timestamp: now,
        runningBalance: newCashBal,
        remarks: payload.remarks || payload.description,
      };
      setCashBook(prev => [...prev, cashEntry]);
    }

    // 2. Post to Bank Book if Bank
    let chosenBankName = '';
    if (payload.mode === 'bank') {
      if (!payload.bankAccountId) {
        throw new Error('Central Transaction Engine: A specific Bank Account must be selected for Bank transactions.');
      }
      const targetBank = bankAccounts.find(b => b.id === payload.bankAccountId);
      chosenBankName = targetBank ? targetBank.bankName : 'Bank Account';
      const prevBankBal = targetBank ? targetBank.currentBalance : 0;
      const newBankBal = prevBankBal + (payload.amount * multiplier);

      // Update Bank Accounts
      setBankAccounts(prev => prev.map(acc => {
        if (acc.id === payload.bankAccountId) {
          return { ...acc, currentBalance: newBankBal };
        }
        return acc;
      }));

      const bankEntry: BankBookEntry = {
        id: `BB-${Date.now().toString().slice(-6)}`,
        date: today,
        bankAccountId: payload.bankAccountId,
        bankName: chosenBankName,
        amount: payload.amount,
        direction: payload.direction,
        classification: payload.classification,
        sourceModule: payload.sourceModule,
        sourceRecordId: payload.sourceRecordId,
        partyName: payload.partyName,
        enteredBy: userName,
        timestamp: now,
        runningBalance: newBankBal,
        remarks: payload.remarks || payload.description,
      };
      setBankBook(prev => [...prev, bankEntry]);
    }

    // 3. Write Central Ledger Entry (Canonical source of truth)
    const ledgerEntry: CentralLedgerEntry = {
      id: `CL-${Date.now().toString().slice(-6)}`,
      date: today,
      amount: payload.amount,
      direction: payload.direction,
      mode: payload.mode,
      bankAccountId: payload.bankAccountId,
      bankName: chosenBankName,
      classification: payload.classification,
      sourceModule: payload.sourceModule,
      sourceRecordId: payload.sourceRecordId,
      partyName: payload.partyName,
      description: payload.description,
      enteredBy: userName,
      timestamp: now,
    };
    setCentralLedger(prev => [...prev, ledgerEntry]);

    // 4. Immutable Audit Event
    addAuditLog(
      `CTE_POST_${payload.direction.toUpperCase()}`,
      payload.sourceModule,
      'CentralLedger',
      ledgerEntry.id,
      `${payload.direction.toUpperCase()} of ₹${payload.amount.toLocaleString('en-IN')} via ${payload.mode.toUpperCase()} (${payload.classification}) for ${payload.partyName}: ${payload.description}`
    );
  };

  // =========================================================================
  // PROFILE MASTER
  // =========================================================================
  const createProfile = (data: Omit<Profile, 'id' | 'createdAt'>): Profile => {
    const nextNum = profiles.length + 101;
    const newId = `P${String(nextNum).padStart(6, '0')}`;
    const newProfile: Profile = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setProfiles(prev => [newProfile, ...prev]);
    addAuditLog('CREATE_PROFILE', 'Platform', 'Profile', newId, `Created customer profile for ${data.name} (${newId})`);
    return newProfile;
  };

  const updateProfile = (id: string, data: Partial<Profile>): boolean => {
    const existing = profiles.find(p => p.id === id);
    if (!existing) return false;
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    addAuditLog('EDIT_PROFILE', 'Platform', 'Profile', id, `Updated profile for ${data.name || existing.name}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const getProfileById = (id?: string) => {
    if (!id) return undefined;
    return profiles.find(p => p.id === id);
  };

  const updateBankAccount = (id: string, data: Partial<BankAccount>): boolean => {
    const existing = bankAccounts.find(b => b.id === id);
    if (!existing) return false;
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    addAuditLog('EDIT_BANK_ACCOUNT', 'Platform', 'BankAccount', id, `Updated bank account ${existing.bankName}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const addBankAccount = (data: Omit<BankAccount, 'id' | 'currentBalance'>): BankAccount => {
    const newId = `BA-${String(bankAccounts.length + 1).padStart(2, '0')}`;
    const newAcc: BankAccount = {
      ...data,
      id: newId,
      currentBalance: data.openingBalance || 0,
    };
    setBankAccounts(prev => [...prev, newAcc]);
    addAuditLog('ADD_BANK_ACCOUNT', 'Platform', 'BankAccount', newId, `Configured new bank account ${data.bankName} (${data.accountNumber})`);
    return newAcc;
  };

  const reverseTransaction = (module: string, recordId: string, reason: string): boolean => {
    if (userRole !== 'admin') {
      alert('Role Enforcement: Financial transaction reversals require Administrator role.');
      return false;
    }
    addAuditLog('REVERSE_TRANSACTION', module, 'CentralLedger', recordId, `Reversed posted transaction ${recordId}: ${reason}`);
    return true;
  };

  const updateLoan = (id: string, data: Partial<Loan>): boolean => {
    const existing = loans.find(l => l.id === id);
    if (!existing) return false;
    setLoans(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    addAuditLog('EDIT_LOAN', 'Finance', 'Loan', id, `Updated parameters for Loan ${id}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const createChitScheme = (data: Omit<ChitScheme, 'id'>): ChitScheme => {
    const nextNum = chitSchemes.length + 1;
    const newId = `SCH-${String(nextNum).padStart(2, '0')}`;
    const nameVal = data.schemeName || data.name || 'New Chit Scheme';
    const newScheme: ChitScheme = {
      ...data,
      id: newId,
      name: nameVal,
      schemeName: nameVal,
      isDividendType: data.isDividendType ?? true,
      description: data.description || 'Standardized chit scheme blueprint',
      totalPoolValue: data.totalPoolValue || data.poolSize || 500000,
      monthlyInstallment: data.monthlyInstallment || data.monthlyBaseInstallment || 10000,
      durationMonths: data.durationMonths || 20,
      maxSubscribers: data.maxSubscribers || data.maxMembers || 20,
      foremanCommissionPercent: data.foremanCommissionPercent || data.commissionPercent || 5,
    };
    setChitSchemes(prev => [...prev, newScheme]);
    addAuditLog('CREATE_CHIT_SCHEME', 'Chit Fund', 'ChitScheme', newId, `Created Chit Scheme ${nameVal} (${newId})`);
    return newScheme;
  };

  const updateChitScheme = (id: string, data: Partial<ChitScheme>): boolean => {
    const existing = chitSchemes.find(s => s.id === id);
    if (!existing) return false;
    setChitSchemes(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    addAuditLog('EDIT_CHIT_SCHEME', 'Chit Fund', 'ChitScheme', id, `Updated chit scheme ${existing.name || existing.schemeName}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const deleteChitScheme = (id: string): boolean => {
    const linkedGroup = chitGroups.find(g => g.schemeId === id);
    if (linkedGroup) {
      alert(`Cannot delete scheme: Linked Chit Group (${linkedGroup.id}) exists under this scheme.`);
      return false;
    }
    setChitSchemes(prev => prev.filter(s => s.id !== id));
    addAuditLog('DELETE_CHIT_SCHEME', 'Chit Fund', 'ChitScheme', id, `Deleted Chit Scheme ${id}`);
    return true;
  };

  const updateChitGroup = (id: string, data: Partial<ChitGroup>): boolean => {
    const existing = chitGroups.find(g => g.id === id);
    if (!existing) return false;
    setChitGroups(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
    addAuditLog('EDIT_CHIT_GROUP', 'Chit Fund', 'ChitGroup', id, `Updated chit group ${id}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const updateParentProperty = (id: string, data: Partial<ParentProperty>): boolean => {
    const existing = parentProperties.find(p => p.id === id);
    if (!existing) return false;
    setParentProperties(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    addAuditLog('EDIT_PARENT_PROPERTY', 'Rental', 'ParentProperty', id, `Updated parent property ${existing.name}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const updateChildProperty = (id: string, data: Partial<ChildProperty>): boolean => {
    const existing = childProperties.find(c => c.id === id);
    if (!existing) return false;
    setChildProperties(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    addAuditLog('EDIT_CHILD_UNIT', 'Rental', 'ChildProperty', id, `Updated unit ${existing.unitNumber}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const updateRentalAgreement = (id: string, data: Partial<RentalAgreement>): boolean => {
    const existing = rentalAgreements.find(a => a.id === id);
    if (!existing) return false;
    setRentalAgreements(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    addAuditLog('EDIT_RENTAL_AGREEMENT', 'Rental', 'RentalAgreement', id, `Updated lease agreement ${id}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const updateExpenseCategory = (id: string, name: string): boolean => {
    const existing = expenseCategories.find(c => c.id === id);
    if (!existing) return false;
    setExpenseCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    addAuditLog('EDIT_EXPENSE_CATEGORY', 'Expense', 'ExpenseCategory', id, `Renamed expense category to ${name}`, JSON.stringify(existing), JSON.stringify({ ...existing, name }));
    return true;
  };

  const updateInvestment = (id: string, data: Partial<InvestmentRecord>): boolean => {
    const existing = investments.find(inv => inv.id === id);
    if (!existing) return false;
    setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, ...data } : inv));
    addAuditLog('EDIT_INVESTMENT', 'Investment', 'InvestmentRecord', id, `Updated investment ${existing.name}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const updateReceivable = (id: string, data: Partial<ReceivableItem>): boolean => {
    const existing = receivables.find(r => r.id === id);
    if (!existing) return false;
    setReceivables(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    addAuditLog('EDIT_RECEIVABLE', 'Receivables & Payables', 'Receivable', id, `Updated receivable ${id}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  const updatePayable = (id: string, data: Partial<PayableItem>): boolean => {
    const existing = payables.find(p => p.id === id);
    if (!existing) return false;
    setPayables(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    addAuditLog('EDIT_PAYABLE', 'Receivables & Payables', 'Payable', id, `Updated payable ${id}`, JSON.stringify(existing), JSON.stringify({ ...existing, ...data }));
    return true;
  };

  // =========================================================================
  // MODULE 1: FINANCE MANAGEMENT
  // =========================================================================
  const createLoanApplication = (data: Partial<Loan>): Loan => {
    const newId = `LN-2026-${String(loans.length + 1).padStart(3, '0')}`;
    const borrower = data.profileId ? profiles.find(p => p.id === data.profileId) : profiles[0];
    const coBorrower = data.coBorrowerProfileId ? profiles.find(p => p.id === data.coBorrowerProfileId) : undefined;
    const guarantor1 = data.guarantor1ProfileId ? profiles.find(p => p.id === data.guarantor1ProfileId) : undefined;
    const guarantor2 = data.guarantor2ProfileId ? profiles.find(p => p.id === data.guarantor2ProfileId) : undefined;

    const newLoan: Loan = {
      id: newId,
      profileId: data.profileId || profiles[0].id,
      borrowerProfileId: data.profileId || profiles[0].id,
      guarantor1ProfileId: data.guarantor1ProfileId,
      guarantor2ProfileId: data.guarantor2ProfileId,
      coBorrowerProfileId: data.coBorrowerProfileId,
      borrowerSnapshot: data.borrowerSnapshot || (borrower ? { ...borrower } : undefined),
      coBorrowerSnapshot: data.coBorrowerSnapshot || (coBorrower ? { ...coBorrower } : undefined),
      guarantor1Snapshot: data.guarantor1Snapshot || (guarantor1 ? { ...guarantor1 } : undefined),
      guarantor2Snapshot: data.guarantor2Snapshot || (guarantor2 ? { ...guarantor2 } : undefined),
      principalAmount: data.principalAmount || 100000,
      deductedAmount: data.deductedAmount || 0,
      manualPenalty: data.manualPenalty || 0,
      pendingPrincipal: Math.max(0, (data.principalAmount || 100000) - (data.deductedAmount || 0)),
      collateralDetails: data.collateralDetails || 'Promissory Note',
      collateralItems: data.collateralItems || [],
      repaymentTerms: data.repaymentTerms || 'Monthly interest collection on pending principal.',
      collectionFrequency: data.collectionFrequency || 'monthly',
      firstCollectionDate: data.firstCollectionDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      officialInterestRate: data.officialInterestRate || 12.0,
      officialInterestFrequency: data.officialInterestFrequency || 'annual',
      nonAccountedInterestRate: data.nonAccountedInterestRate || 6.0,
      nonAccountedInterestFrequency: data.nonAccountedInterestFrequency || 'annual',
      natureOfFacilities: data.natureOfFacilities || 'Term Loan / Hypothecation',
      purposeOfLoan: data.purposeOfLoan || 'Business Expansion & Working Capital',
      sourcesOfRepayment: data.sourcesOfRepayment || 'Business Cash Flows & Receivables',
      applicationPlace: data.applicationPlace || 'Bangalore',
      applicationDate: data.applicationDate || new Date().toISOString().slice(0, 10),
      status: 'pending_approval',
      createdBy: userName,
      createdAt: new Date().toISOString(),
      topUpHistory: [],
      totalOfficialInterestCollected: 0,
      totalNonAccountedInterestCollected: 0,
      totalPrincipalCollected: 0,
      totalPenaltyCollected: 0,
    };
    setLoans(prev => [newLoan, ...prev]);

    // Auto-register loan application form in Document Repository
    const newDoc: DocumentItem = {
      id: `DOC-${Date.now().toString().slice(-6)}`,
      fileName: `Loan_Application_${newId}.pdf`,
      docType: 'loan_agreement',
      module: 'Finance',
      entityId: newId,
      entityType: 'loan',
      partyProfileId: newLoan.profileId,
      fileSize: '245 KB',
      uploadedBy: userName,
      uploadedAt: new Date().toISOString(),
    };
    setDocuments(prev => [newDoc, ...prev]);

    addAuditLog('SUBMIT_LOAN_APPLICATION', 'Finance', 'Loan', newId, `Submitted loan application for ₹${newLoan.principalAmount.toLocaleString('en-IN')} for review.`);
    sendNotification('New Loan Application Submitted', `Loan ${newId} submitted by ${userName} for ₹${newLoan.principalAmount.toLocaleString('en-IN')}`, 'Finance', 'approval_required');
    return newLoan;
  };

  const sanctionLoan = (loanId: string, remarks: string): boolean => {
    if (userRole !== 'admin') {
      alert('Role Enforcement: Only an Administrator can approve and sanction loans.');
      return false;
    }
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return false;

    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'active',
          approvedBy: userName,
          approvalDate: new Date().toISOString(),
          approvalRemarks: remarks,
        };
      }
      return l;
    }));

    addAuditLog('SANCTION_LOAN', 'Finance', 'Loan', loanId, `Administrator sanctioned loan ${loanId} with remarks: ${remarks}`);
    sendNotification('Loan Sanctioned & Activated', `Loan ${loanId} for ₹${loan.principalAmount.toLocaleString('en-IN')} is approved. Ready for disbursement.`, 'Finance', 'action_completed');
    return true;
  };

  const rejectLoan = (loanId: string, remarks: string): boolean => {
    if (userRole !== 'admin') {
      alert('Role Enforcement: Only an Administrator can reject loans.');
      return false;
    }
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'closed',
          approvalRemarks: `REJECTED: ${remarks}`,
          closureDate: new Date().toISOString().slice(0, 10),
          closedBy: userName,
        };
      }
      return l;
    }));
    addAuditLog('REJECT_LOAN', 'Finance', 'Loan', loanId, `Loan ${loanId} rejected: ${remarks}`);
    return true;
  };

  const disburseLoan = (loanId: string, mode: PaymentMode, bankAccountId?: string): boolean => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'active') return false;

    // Post to CTE
    postCentralTransaction({
      amount: loan.principalAmount,
      direction: 'payment',
      mode,
      bankAccountId,
      classification: 'accounted',
      sourceModule: 'Finance',
      sourceRecordId: loan.id,
      partyName: getProfileById(loan.profileId)?.name || 'Borrower',
      description: `Principal disbursement for Loan ${loan.id}`,
    });

    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          disbursementDate: new Date().toISOString().slice(0, 10),
          disbursementMode: mode,
          disbursingBankId: bankAccountId,
        };
      }
      return l;
    }));

    addAuditLog('DISBURSE_LOAN', 'Finance', 'Loan', loanId, `Disbursed ₹${loan.principalAmount.toLocaleString('en-IN')} via ${mode.toUpperCase()}`);
    sendNotification('Loan Principal Disbursed', `Loan ${loanId} disbursement completed via ${mode.toUpperCase()}`, 'Finance', 'payment_confirmation');
    return true;
  };

  const collectLoanPayment = (
    loanId: string,
    payload: {
      principal: number;
      officialInterest: number;
      nonAccountedInterest: number;
      penalty: number;
      otherCharges: number;
      mode: PaymentMode;
      bankAccountId?: string;
      remarks?: string;
    }
  ): string => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) throw new Error('Loan not found');

    const totalAmount = payload.principal + payload.officialInterest + payload.nonAccountedInterest + payload.penalty + payload.otherCharges;
    const receiptNum = `${masterData.receiptPrefix}${Date.now().toString().slice(-6)}`;
    const partyName = getProfileById(loan.profileId)?.name || 'Borrower';

    // Post Accounted portion to CTE (Principal + Official Interest + Penalty + Other)
    const accountedPortion = payload.principal + payload.officialInterest + payload.penalty + payload.otherCharges;
    if (accountedPortion > 0) {
      postCentralTransaction({
        amount: accountedPortion,
        direction: 'receipt',
        mode: payload.mode,
        bankAccountId: payload.bankAccountId,
        classification: 'accounted',
        sourceModule: 'Finance',
        sourceRecordId: loan.id,
        partyName,
        description: `Loan ${loan.id} collection (Principal: ₹${payload.principal}, Off. Int: ₹${payload.officialInterest})`,
        remarks: payload.remarks,
      });
    }

    // Post Non-Accounted portion to CTE separately! (Never merged into accounted figure)
    if (payload.nonAccountedInterest > 0) {
      postCentralTransaction({
        amount: payload.nonAccountedInterest,
        direction: 'receipt',
        mode: payload.mode,
        bankAccountId: payload.bankAccountId,
        classification: 'non_accounted',
        sourceModule: 'Finance',
        sourceRecordId: loan.id,
        partyName,
        description: `Loan ${loan.id} operational interest (Non-Accounted: ₹${payload.nonAccountedInterest})`,
        remarks: payload.remarks,
      });
    }

    // Dynamic Recalculation on pending principal
    const newPendingPrincipal = Math.max(0, loan.pendingPrincipal - payload.principal);

    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          pendingPrincipal: newPendingPrincipal,
          totalPrincipalCollected: l.totalPrincipalCollected + payload.principal,
          totalOfficialInterestCollected: l.totalOfficialInterestCollected + payload.officialInterest,
          totalNonAccountedInterestCollected: l.totalNonAccountedInterestCollected + payload.nonAccountedInterest,
          totalPenaltyCollected: l.totalPenaltyCollected + payload.penalty,
          lastPaymentDate: new Date().toISOString().slice(0, 10),
          // Rule BR-011: Zero balance does NOT auto close! Remains Active until Admin closes explicitly.
        };
      }
      return l;
    }));

    addAuditLog(
      'RECORD_LOAN_COLLECTION',
      'Finance',
      'Loan',
      loan.id,
      `Recorded collection ₹${totalAmount.toLocaleString('en-IN')} (Receipt ${receiptNum}). Pending principal reduced from ₹${loan.pendingPrincipal.toLocaleString('en-IN')} to ₹${newPendingPrincipal.toLocaleString('en-IN')}.`
    );

    sendNotification(
      'Payment Received & Receipt Generated',
      `Payment of ₹${totalAmount.toLocaleString('en-IN')} collected for Loan ${loan.id}. Receipt #${receiptNum} issued to ${partyName}.`,
      'Finance',
      'payment_confirmation'
    );

    return receiptNum;
  };

  const topUpLoan = (loanId: string, amount: number, mode: PaymentMode, bankAccountId?: string, remarks?: string): boolean => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'active') return false;

    // Post disbursement to CTE under SAME loan ID (Rule BR-012)
    postCentralTransaction({
      amount,
      direction: 'payment',
      mode,
      bankAccountId,
      classification: 'accounted',
      sourceModule: 'Finance',
      sourceRecordId: loan.id,
      partyName: getProfileById(loan.profileId)?.name || 'Borrower',
      description: `Loan Top-Up additional principal under same Loan ID ${loan.id}`,
      remarks,
    });

    const topUpItem: TopUpEntry = {
      id: `TU-${Date.now().toString().slice(-6)}`,
      loanId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      approvedBy: userName,
      disbursementMode: mode,
      disbursingBankId: bankAccountId,
      remarks: remarks || 'Top-up principal sanctioned',
    };

    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          principalAmount: l.principalAmount + amount,
          pendingPrincipal: l.pendingPrincipal + amount,
          topUpHistory: [...l.topUpHistory, topUpItem],
        };
      }
      return l;
    }));

    addAuditLog('TOP_UP_LOAN', 'Finance', 'Loan', loanId, `Top-up of ₹${amount.toLocaleString('en-IN')} added under SAME Loan ID ${loanId}`);
    return true;
  };

  const closeLoan = (loanId: string): boolean => {
    if (userRole !== 'admin') {
      alert('Role Enforcement: Loan closure is restricted to Administrator only.');
      return false;
    }
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'closed',
          closureDate: new Date().toISOString().slice(0, 10),
          closedBy: userName,
        };
      }
      return l;
    }));
    addAuditLog('CLOSE_LOAN', 'Finance', 'Loan', loanId, `Administrator closed loan ${loanId}. Record archived.`);
    return true;
  };

  // =========================================================================
  // MODULE 2: CHIT FUND MANAGEMENT
  // =========================================================================
  const createChitGroup = (data: Partial<ChitGroup>): ChitGroup => {
    const nextNum = chitGroups.length + 1;
    const newId = `CG-2026-${String(nextNum).padStart(2, '0')}`;
    const newGroup: ChitGroup = {
      id: newId,
      schemeId: data.schemeId || chitSchemes[0].id,
      schemeName: chitSchemes.find(s => s.id === data.schemeId)?.name || chitSchemes[0].name,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      durationMonths: data.durationMonths || 20,
      monthlyInstallment: data.monthlyInstallment || 10000,
      currentInstallmentAmount: data.monthlyInstallment || 10000,
      collectionFrequency: 'monthly',
      memberCapacity: data.memberCapacity || 20,
      enrolledMembersCount: 0,
      penaltyPercentage: data.penaltyPercentage || 2.0,
      dividendStructureDescription: data.dividendStructureDescription || 'Auction discount pool divided equally among non-prized members.',
      status: 'pending_approval',
      currentCycle: 1,
    };
    setChitGroups(prev => [newGroup, ...prev]);
    addAuditLog('CREATE_CHIT_GROUP', 'Chit Fund', 'ChitGroup', newId, `Configured new Chit Group ${newId}`);
    return newGroup;
  };

  const activateChitGroup = (groupId: string): boolean => {
    if (userRole !== 'admin') {
      alert('Role Enforcement: Chit Scheme/Group activation requires Administrator approval.');
      return false;
    }
    setChitGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, status: 'active', approvedBy: userName };
      }
      return g;
    }));
    addAuditLog('ACTIVATE_CHIT_GROUP', 'Chit Fund', 'ChitGroup', groupId, `Administrator approved and activated Chit Group ${groupId}`);
    return true;
  };

  const enrollChitMember = (groupId: string, profileId: string): boolean => {
    const group = chitGroups.find(g => g.id === groupId);
    if (!group) return false;
    if (group.enrolledMembersCount >= group.memberCapacity) {
      alert('Capacity Exceeded: This chit group is already at maximum capacity.');
      return false;
    }
    const alreadyEnrolled = chitMembers.some(m => m.groupId === groupId && m.profileId === profileId);
    if (alreadyEnrolled) {
      alert('Member Already Enrolled: This profile is already a member of this chit group.');
      return false;
    }

    const newMember: ChitMember = {
      id: `CM-${Date.now().toString().slice(-6)}`,
      groupId,
      profileId,
      joinDate: new Date().toISOString().slice(0, 10),
      isKycVerified: true,
      totalPaid: 0,
      pendingDue: group.currentInstallmentAmount,
      penaltyDue: 0,
      hasWonAuction: false,
    };

    setChitMembers(prev => [...prev, newMember]);
    setChitGroups(prev => prev.map(g => g.id === groupId ? { ...g, enrolledMembersCount: g.enrolledMembersCount + 1 } : g));

    const memberName = getProfileById(profileId)?.name || profileId;
    addAuditLog('ENROLL_CHIT_MEMBER', 'Chit Fund', 'ChitMember', newMember.id, `Enrolled member ${memberName} (${profileId}) in Chit Group ${groupId}`);
    return true;
  };

  const collectChitInstallment = (
    memberId: string,
    amount: number,
    penalty: number,
    mode: PaymentMode,
    bankAccountId?: string
  ): string => {
    const member = chitMembers.find(m => m.id === memberId);
    if (!member) throw new Error('Member not found');
    const group = chitGroups.find(g => g.id === member.groupId);
    const receiptNum = `${masterData.receiptPrefix}${Date.now().toString().slice(-6)}`;
    const partyName = getProfileById(member.profileId)?.name || 'Chit Member';

    // Post to CTE
    postCentralTransaction({
      amount: amount + penalty,
      direction: 'receipt',
      mode,
      bankAccountId,
      classification: 'accounted',
      sourceModule: 'Chit Fund',
      sourceRecordId: member.groupId,
      partyName,
      description: `Chit Group ${member.groupId} Cycle ${group?.currentCycle || 1} installment (Base: ₹${amount}, Penalty: ₹${penalty})`,
    });

    setChitMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          totalPaid: m.totalPaid + amount,
          pendingDue: Math.max(0, m.pendingDue - amount),
          penaltyDue: Math.max(0, m.penaltyDue - penalty),
        };
      }
      return m;
    }));

    addAuditLog('COLLECT_CHIT_INSTALLMENT', 'Chit Fund', 'ChitMember', memberId, `Collected ₹${(amount + penalty).toLocaleString('en-IN')} from ${partyName} for Chit Group ${member.groupId}`);
    return receiptNum;
  };

  const recordAuctionWinner = (
    groupId: string,
    winnerProfileId: string,
    bidPrize: number,
    mode: PaymentMode,
    bankAccountId?: string
  ): boolean => {
    const group = chitGroups.find(g => g.id === groupId);
    if (!group) return false;

    const winnerName = getProfileById(winnerProfileId)?.name || 'Auction Winner';
    const totalPool = group.monthlyInstallment * group.memberCapacity;
    const bidDiscount = totalPool - bidPrize;
    const foremanCommission = totalPool * 0.05; // 5% standard commission
    const dividendPool = Math.max(0, bidDiscount - foremanCommission);
    const nonPrizedCount = Math.max(1, group.memberCapacity - group.currentCycle);
    const dividendPerMember = Math.floor(dividendPool / nonPrizedCount);
    const calculatedNextCollection = Math.max(0, group.monthlyInstallment - dividendPerMember);

    // 1. Post Prize Disbursement via CTE
    postCentralTransaction({
      amount: bidPrize,
      direction: 'payment',
      mode,
      bankAccountId,
      classification: 'accounted',
      sourceModule: 'Chit Fund',
      sourceRecordId: groupId,
      partyName: winnerName,
      description: `Chit Prize Disbursement for Group ${groupId} Cycle ${group.currentCycle}`,
    });

    // 2. Record Auction
    const newAuction: AuctionRecord = {
      id: `AUC-${Date.now().toString().slice(-6)}`,
      groupId,
      cycleNumber: group.currentCycle,
      auctionDate: new Date().toISOString().slice(0, 10),
      winnerProfileId,
      winnerName,
      bidPrizeAmount: bidPrize,
      disbursementMode: mode,
      disbursingBankId: bankAccountId,
      calculatedNextCollection,
      dividendPerMember,
      announcedAt: new Date().toISOString(),
      enteredBy: userName,
    };
    setAuctionRecords(prev => [newAuction, ...prev]);

    // 3. Update Group's currentInstallmentAmount and increment cycle
    setChitGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          currentInstallmentAmount: calculatedNextCollection,
          currentCycle: g.currentCycle + 1,
        };
      }
      return g;
    }));

    // 4. Update winner status and next cycle dues for members
    setChitMembers(prev => prev.map(m => {
      if (m.groupId === groupId) {
        if (m.profileId === winnerProfileId) {
          return {
            ...m,
            hasWonAuction: true,
            wonCycle: group.currentCycle,
            prizeAmountWon: bidPrize,
            pendingDue: calculatedNextCollection,
          };
        }
        return {
          ...m,
          pendingDue: calculatedNextCollection,
        };
      }
      return m;
    }));

    addAuditLog(
      'RECORD_AUCTION_WINNER',
      'Chit Fund',
      'ChitGroup',
      groupId,
      `Auction Cycle ${group.currentCycle}: ${winnerName} won prize ₹${bidPrize.toLocaleString('en-IN')}. Next collection amount auto-recalculated to ₹${calculatedNextCollection.toLocaleString('en-IN')} (Dividend ₹${dividendPerMember}/member).`
    );

    sendNotification(
      'Chit Auction Winner Declared',
      `Chit Group ${groupId}: ${winnerName} won Cycle ${group.currentCycle} with prize ₹${bidPrize.toLocaleString('en-IN')}. Next month due reduced to ₹${calculatedNextCollection.toLocaleString('en-IN')}.`,
      'Chit Fund',
      'action_completed'
    );

    return true;
  };

  const closeChitGroup = (groupId: string): boolean => {
    if (userRole !== 'admin') {
      alert('Role Enforcement: Chit Scheme closure requires Administrator role.');
      return false;
    }
    setChitGroups(prev => prev.map(g => g.id === groupId ? { ...g, status: 'closed' } : g));
    addAuditLog('CLOSE_CHIT_GROUP', 'Chit Fund', 'ChitGroup', groupId, `Administrator closed and settled Chit Group ${groupId}`);
    return true;
  };

  // =========================================================================
  // MODULE 3: RENTAL MANAGEMENT
  // =========================================================================
  const nextSequence = (ids: string[]) =>
    ids.reduce((max, id) => Math.max(max, parseInt(id.split('-').pop() || '0', 10) || 0), 0) + 1;

  const createParentProperty = (data: Partial<ParentProperty>): ParentProperty => {
    const nextNum = nextSequence(parentProperties.map(p => p.id));
    const newId = `PROP-P-${String(nextNum).padStart(2, '0')}`;
    const newProp: ParentProperty = {
      id: newId,
      name: data.name || `Dhavanam Commercial Complex ${nextNum}`,
      address: data.address || 'Commercial District, Bangalore',
      propertyType: data.propertyType || 'commercial',
      ownership: data.ownership || 'Dhavanam Group (100% Direct)',
      description: data.description,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      expectedMonthlyRent: 0,
      totalOutstanding: 0,
    };
    setParentProperties(prev => [...prev, newProp]);
    addAuditLog('CREATE_PARENT_PROPERTY', 'Rental', 'ParentProperty', newId, `Added parent property ${newProp.name} (${newId})`);
    return newProp;
  };

  const deleteParentProperty = (id: string): boolean => {
    const linkedUnits = childProperties.filter(c => c.parentPropertyId === id);
    if (linkedUnits.length > 0) {
      alert(`Cannot delete parent property: ${linkedUnits.length} child unit(s) are attached to this parent property.`);
      return false;
    }
    setParentProperties(prev => prev.filter(p => p.id !== id));
    addAuditLog('DELETE_PARENT_PROPERTY', 'Rental', 'ParentProperty', id, `Deleted parent property ${id}`);
    return true;
  };

  const createProperty = (data: Partial<ChildProperty>) => {
    const nextNum = nextSequence(childProperties.map(c => c.id));
    const newId = `PROP-C-${String(nextNum).padStart(2, '0')}`;
    const parentId = data.parentPropertyId || parentProperties[0]?.id || 'PROP-P-01';
    const parentName = parentProperties.find(p => p.id === parentId)?.name || 'Parent Property';
    const newProp: ChildProperty = {
      id: newId,
      parentPropertyId: parentId,
      parentPropertyName: parentName,
      unitNumber: data.unitNumber || `Unit ${nextNum}`,
      propertyType: data.propertyType || 'residential',
      floor: data.floor || '1st Floor',
      description: data.description,
      amenities: data.amenities || ['Power Backup', 'Security'],
      status: data.status === 'maintenance' ? 'maintenance' : 'vacant',
      rentAmount: data.rentAmount ?? 0,
      maintenanceAmount: data.maintenanceAmount ?? 2000,
      vacancyDays: 0,
    };
    setChildProperties(prev => [...prev, newProp]);

    // Recalculate parent property roll-ups dynamically
    setParentProperties(prev => prev.map(parent => {
      if (parent.id === newProp.parentPropertyId) {
        return {
          ...parent,
          totalUnits: parent.totalUnits + 1,
          vacantUnits: parent.vacantUnits + 1,
          expectedMonthlyRent: parent.expectedMonthlyRent + newProp.rentAmount,
        };
      }
      return parent;
    }));

    addAuditLog('CREATE_PROPERTY', 'Rental', 'Property', newId, `Added child property ${newProp.unitNumber} to ${newProp.parentPropertyName}`);
  };

  const deleteChildProperty = (id: string): boolean => {
    const activeAgreement = rentalAgreements.find(a => a.childPropertyId === id && a.status === 'active');
    if (activeAgreement) {
      alert(`Cannot delete unit: An active lease agreement (${activeAgreement.id}) exists for this unit.`);
      return false;
    }
    const targetUnit = childProperties.find(c => c.id === id);
    if (targetUnit?.parentPropertyId) {
      setParentProperties(prev => prev.map(p => {
        if (p.id === targetUnit.parentPropertyId) {
          return {
            ...p,
            totalUnits: Math.max(0, p.totalUnits - 1),
            vacantUnits: targetUnit.status === 'vacant' ? Math.max(0, p.vacantUnits - 1) : p.vacantUnits,
            occupiedUnits: targetUnit.status === 'occupied' ? Math.max(0, p.occupiedUnits - 1) : p.occupiedUnits,
            expectedMonthlyRent: Math.max(0, p.expectedMonthlyRent - (targetUnit.rentAmount || 0)),
          };
        }
        return p;
      }));
    }
    setChildProperties(prev => prev.filter(c => c.id !== id));
    addAuditLog('DELETE_CHILD_PROPERTY', 'Rental', 'ChildProperty', id, `Deleted unit ${id}`);
    return true;
  };

  const reviseRent = (agreementId: string, newRentAmount: number, newMaintenanceAmount?: number): boolean => {
    const agreement = rentalAgreements.find(a => a.id === agreementId);
    if (!agreement) return false;
    const oldRent = agreement.rentAmount;
    setRentalAgreements(prev => prev.map(a => {
      if (a.id === agreementId) {
        return {
          ...a,
          rentAmount: newRentAmount,
          maintenanceAmount: newMaintenanceAmount !== undefined ? newMaintenanceAmount : a.maintenanceAmount,
        };
      }
      return a;
    }));
    setChildProperties(prev => prev.map(cp => {
      if (cp.id === agreement.childPropertyId) {
        return {
          ...cp,
          rentAmount: newRentAmount,
          standardRent: newRentAmount,
          maintenanceAmount: newMaintenanceAmount !== undefined ? newMaintenanceAmount : cp.maintenanceAmount,
        };
      }
      return cp;
    }));
    addAuditLog('REVISE_RENT', 'Rental', 'Agreement', agreementId, `Revised rent for Lease ${agreementId}: Rent ₹${oldRent} -> ₹${newRentAmount}`);
    return true;
  };

  const renewLease = (agreementId: string, newEndDate: string, newRentAmount?: number): boolean => {
    const agreement = rentalAgreements.find(a => a.id === agreementId);
    if (!agreement) return false;
    const oldEndDate = agreement.endDate;
    setRentalAgreements(prev => prev.map(a => {
      if (a.id === agreementId) {
        return {
          ...a,
          endDate: newEndDate,
          rentAmount: newRentAmount !== undefined ? newRentAmount : a.rentAmount,
          status: 'active',
        };
      }
      return a;
    }));
    addAuditLog('RENEW_LEASE', 'Rental', 'Agreement', agreementId, `Renewed Lease ${agreementId}: End Date extended from ${oldEndDate} to ${newEndDate}`);
    return true;
  };

  const createRentalAgreement = (data: Omit<RentalAgreement, 'id' | 'status'>) => {
    const newId = `AGR-2026-${String(rentalAgreements.length + 1).padStart(2, '0')}`;
    const newAgreement: RentalAgreement = {
      ...data,
      id: newId,
      status: 'active',
    };
    setRentalAgreements(prev => [...prev, newAgreement]);

    // Automatically set child property to Occupied (Rule BR-020)
    setChildProperties(prev => prev.map(cp => {
      if (cp.id === data.childPropertyId) {
        return {
          ...cp,
          status: 'occupied',
          currentTenantProfileId: data.tenantProfileId,
          vacancyDays: 0,
        };
      }
      return cp;
    }));

    // Update parent property roll-up
    const child = childProperties.find(c => c.id === data.childPropertyId);
    if (child?.parentPropertyId) {
      setParentProperties(prev => prev.map(p => {
        if (p.id === child.parentPropertyId) {
          return {
            ...p,
            occupiedUnits: p.occupiedUnits + 1,
            vacantUnits: Math.max(0, p.vacantUnits - 1),
          };
        }
        return p;
      }));
    }

    addAuditLog('CREATE_RENTAL_AGREEMENT', 'Rental', 'Agreement', newId, `Created rental agreement ${newId} for tenant ${data.tenantProfileId}`);
  };

  const collectRent = (
    agreementId: string,
    rentAmount: number,
    maintenanceAmount: number,
    mode: PaymentMode,
    bankAccountId?: string
  ): string => {
    const agreement = rentalAgreements.find(a => a.id === agreementId);
    if (!agreement) throw new Error('Rental agreement not found');

    const totalAmount = rentAmount + maintenanceAmount;
    const receiptNum = `${masterData.receiptPrefix}${Date.now().toString().slice(-6)}`;
    const partyName = getProfileById(agreement.tenantProfileId)?.name || 'Tenant';

    // Post to CTE
    postCentralTransaction({
      amount: totalAmount,
      direction: 'receipt',
      mode,
      bankAccountId,
      classification: 'accounted',
      sourceModule: 'Rental',
      sourceRecordId: agreementId,
      partyName,
      description: `Rent & Maintenance collection for Agreement ${agreementId} (Rent: ₹${rentAmount}, Maint: ₹${maintenanceAmount})`,
    });

    const newCollection: RentCollection = {
      id: `RC-${Date.now().toString().slice(-6)}`,
      agreementId,
      childPropertyId: agreement.childPropertyId,
      tenantProfileId: agreement.tenantProfileId,
      collectionType: agreement.collectionType,
      rentAmount,
      maintenanceAmount,
      totalAmount,
      paymentMode: mode,
      bankAccountId,
      date: new Date().toISOString().slice(0, 10),
      receiptNumber: receiptNum,
      collectedBy: userName,
      timestamp: new Date().toISOString(),
    };
    setRentCollections(prev => [newCollection, ...prev]);

    addAuditLog('COLLECT_RENT', 'Rental', 'Collection', newCollection.id, `Collected ₹${totalAmount.toLocaleString('en-IN')} rent from ${partyName}`);
    return receiptNum;
  };

  const closeLease = (agreementId: string) => {
    const agreement = rentalAgreements.find(a => a.id === agreementId);
    if (!agreement) return;

    setRentalAgreements(prev => prev.map(a => a.id === agreementId ? { ...a, status: 'terminated' } : a));

    // Reset child property to Vacant (Rule BR-020)
    setChildProperties(prev => prev.map(cp => {
      if (cp.id === agreement.childPropertyId) {
        return {
          ...cp,
          status: 'vacant',
          currentTenantProfileId: undefined,
          vacancyDays: 1,
        };
      }
      return cp;
    }));

    // Update parent property roll-up
    const child = childProperties.find(c => c.id === agreement.childPropertyId);
    if (child?.parentPropertyId) {
      setParentProperties(prev => prev.map(p => {
        if (p.id === child.parentPropertyId) {
          return {
            ...p,
            occupiedUnits: Math.max(0, p.occupiedUnits - 1),
            vacantUnits: p.vacantUnits + 1,
          };
        }
        return p;
      }));
    }

    addAuditLog('CLOSE_LEASE', 'Rental', 'Agreement', agreementId, `Closed lease agreement ${agreementId}. Property marked vacant.`);
  };

  // -------------------------------------------------------------------------
  // Rental: tenant allocation, renewal, collections, exit & settlement
  // NOTE: postCentralTransaction reads book balances from the current render, so each
  // user action below posts at most one CTE entry.
  // -------------------------------------------------------------------------
  const syncParentRollup = (parentId: string | undefined, occupiedDelta: number) => {
    if (!parentId) return;
    setParentProperties(prev => prev.map(p => p.id === parentId
      ? {
          ...p,
          occupiedUnits: Math.max(0, p.occupiedUnits + occupiedDelta),
          vacantUnits: Math.max(0, p.vacantUnits - occupiedDelta),
        }
      : p));
  };

  const allocateTenant = (data: TenantAllocationInput): ActionResult => {
    const child = childProperties.find(c => c.id === data.childPropertyId);
    if (!child) return { ok: false, message: 'Select a child property.' };
    if (child.status !== 'vacant') {
      return { ok: false, message: `${child.unitNumber} is ${child.status}. Only vacant units can be allocated.` };
    }
    if (rentalAgreements.some(a => a.childPropertyId === child.id && a.status === 'active')) {
      return { ok: false, message: `${child.unitNumber} already has an active allocation.` };
    }
    const tenant = getProfileById(data.tenantProfileId);
    if (!tenant) return { ok: false, message: 'Select a tenant from the Master Profile.' };
    if (!data.startDate || !data.endDate || data.endDate <= data.startDate) {
      return { ok: false, message: 'Expiry date must be after the commencement date.' };
    }
    const isLease = data.occupancyType === 'lease';
    if (!isLease && !(data.rentAmount > 0)) return { ok: false, message: 'Enter the monthly rent.' };
    if (isLease && !((data.leaseAmount || 0) > 0)) return { ok: false, message: 'Enter the lease amount.' };
    const held = (data.securityDeposit || 0) + (data.advanceAmount || 0);
    if (data.recordDeposit && held > 0 && data.paymentMode === 'bank' && !data.bankAccountId) {
      return { ok: false, message: 'Select the bank account that received the deposit.' };
    }

    const newId = `AGR-${new Date().getFullYear()}-${String(nextSequence(rentalAgreements.map(a => a.id))).padStart(2, '0')}`;
    const occupancyStart = data.occupancyStartDate || data.startDate;
    const agreement: RentalAgreement = {
      id: newId,
      occupancyId: newId,
      childPropertyId: child.id,
      tenantProfileId: tenant.id,
      occupancyType: data.occupancyType,
      rentAmount: isLease ? 0 : data.rentAmount,
      leaseAmount: isLease ? data.leaseAmount : undefined,
      leaseTerms: data.leaseTerms,
      securityDeposit: data.securityDeposit || 0,
      advanceAmount: data.advanceAmount || 0,
      maintenanceAmount: data.maintenanceAmount || 0,
      collectionType: isLease ? 'maintenance_only' : 'combined',
      agreementDate: data.agreementDate || data.startDate,
      occupancyStartDate: occupancyStart,
      occupants: data.occupants,
      startDate: data.startDate,
      endDate: data.endDate,
      billingStartMonth: monthOf(occupancyStart),
      dueDayOfMonth: data.dueDayOfMonth,
      status: 'active',
      agreementDocumentName: data.documentName,
      documentStatus: data.documentName ? 'uploaded' : 'pending_upload',
      depositPaymentMode: data.recordDeposit ? data.paymentMode : undefined,
      depositBankAccountId: data.recordDeposit ? data.bankAccountId : undefined,
    };

    if (data.recordDeposit && held > 0) {
      postCentralTransaction({
        amount: held,
        direction: 'receipt',
        mode: data.paymentMode,
        bankAccountId: data.bankAccountId,
        classification: 'accounted',
        sourceModule: 'Rental',
        sourceRecordId: newId,
        partyName: tenant.name,
        description: `Refundable security deposit ₹${(data.securityDeposit || 0).toLocaleString('en-IN')} + advance ₹${(data.advanceAmount || 0).toLocaleString('en-IN')} for ${child.unitNumber} (liability - not rental income)`,
      });
    }

    setRentalAgreements(prev => [...prev, agreement]);
    setChildProperties(prev => prev.map(cp => cp.id === child.id
      ? {
          ...cp,
          status: 'occupied',
          currentTenantProfileId: tenant.id,
          vacancyDays: 0,
          rentAmount: agreement.rentAmount,
          maintenanceAmount: agreement.maintenanceAmount,
        }
      : cp));
    syncParentRollup(child.parentPropertyId, 1);

    if (data.documentName) {
      uploadDocument({
        entityType: 'property',
        entityId: newId,
        docType: 'Rental Agreement',
        title: `Agreement ${newId}`,
        fileName: data.documentName,
        fileSize: data.documentSize || '—',
        module: 'Rental',
        partyProfileId: tenant.id,
      });
    }

    addAuditLog('ALLOCATE_TENANT', 'Rental', 'Agreement', newId, `Allocated ${child.unitNumber} to ${tenant.name} as ${data.occupancyType.toUpperCase()} (${newId})`);
    return { ok: true, id: newId };
  };

  const uploadAgreementDocument = (agreementId: string, fileName: string, fileSize: string) => {
    const agreement = rentalAgreements.find(a => a.id === agreementId);
    if (!agreement) return;
    setRentalAgreements(prev => prev.map(a => a.id === agreementId
      ? { ...a, agreementDocumentName: fileName, documentStatus: 'uploaded' }
      : a));
    uploadDocument({
      entityType: 'property',
      entityId: agreementId,
      docType: 'Rental Agreement',
      title: `Agreement ${agreementId}`,
      fileName,
      fileSize,
      module: 'Rental',
      partyProfileId: agreement.tenantProfileId,
    });
  };

  const renewAgreement = (agreementId: string, data: AgreementRenewalInput): ActionResult => {
    const old = rentalAgreements.find(a => a.id === agreementId);
    if (!old || old.status !== 'active') return { ok: false, message: 'Only an active agreement can be renewed.' };
    if (!data.startDate || !data.endDate || data.endDate <= data.startDate) {
      return { ok: false, message: 'New expiry date must be after the new commencement date.' };
    }
    const isLease = (old.occupancyType || 'rental') === 'lease';
    if (!isLease && !(data.rentAmount > 0)) return { ok: false, message: 'Enter the monthly rent.' };
    if (isLease && !((data.leaseAmount || 0) > 0)) return { ok: false, message: 'Enter the lease amount.' };

    const occ = occupancyKey(old);
    const newId = `AGR-${new Date().getFullYear()}-${String(nextSequence(rentalAgreements.map(a => a.id))).padStart(2, '0')}`;
    const renewed: RentalAgreement = {
      ...old,
      id: newId,
      occupancyId: occ,
      previousAgreementId: old.id,
      rentAmount: isLease ? 0 : data.rentAmount,
      leaseAmount: isLease ? data.leaseAmount : undefined,
      leaseTerms: data.leaseTerms ?? old.leaseTerms,
      maintenanceAmount: data.maintenanceAmount || 0,
      securityDeposit: data.securityDeposit || 0,
      dueDayOfMonth: data.dueDayOfMonth,
      agreementDate: data.agreementDate || data.startDate,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'active',
      agreementDocumentName: data.documentName,
      agreementDocumentUrl: undefined,
      documentStatus: data.documentName ? 'uploaded' : 'pending_upload',
    };

    setRentalAgreements(prev => [...prev.map(a => a.id === old.id ? { ...a, status: 'renewed' as const } : a), renewed]);

    // Re-point the schedule at the new terms. Dues are keyed by occupancy+month, so nothing is duplicated;
    // only unpaid dues from the new commencement month onward are repriced, paid/partly-paid amounts are kept.
    const fromMonth = monthOf(data.startDate);
    setRentalDues(prev => prev.map(d => {
      if (d.occupancyId !== occ || d.closedInSettlement || d.month < fromMonth) return d;
      const untouched = d.rentPaid + d.maintenancePaid === 0;
      return {
        ...d,
        agreementId: newId,
        dueDate: dueDateFor(d.month, data.dueDayOfMonth),
        rentDue: untouched ? renewed.rentAmount : d.rentDue,
        maintenanceDue: untouched ? renewed.maintenanceAmount : d.maintenanceDue,
      };
    }));

    setChildProperties(prev => prev.map(cp => cp.id === old.childPropertyId
      ? { ...cp, rentAmount: renewed.rentAmount, maintenanceAmount: renewed.maintenanceAmount }
      : cp));

    if (data.documentName) {
      uploadDocument({
        entityType: 'property',
        entityId: newId,
        docType: 'Rental Agreement (Renewal)',
        title: `Agreement ${newId} (renews ${old.id})`,
        fileName: data.documentName,
        fileSize: data.documentSize || '—',
        module: 'Rental',
        partyProfileId: old.tenantProfileId,
      });
    }

    addAuditLog('RENEW_AGREEMENT', 'Rental', 'Agreement', newId, `Renewed ${old.id} as ${newId}: ${old.startDate}→${old.endDate} extended to ${data.startDate}→${data.endDate}`);
    return { ok: true, id: newId };
  };

  const collectRentalPayment = (data: RentalPaymentInput): ActionResult => {
    const agreement = rentalAgreements.find(a => a.childPropertyId === data.childPropertyId && a.status === 'active');
    if (!agreement) return { ok: false, message: 'No active occupancy for this unit.' };
    if (!(data.amount > 0)) return { ok: false, message: 'Enter a collection amount greater than zero.' };
    if (data.mode === 'bank' && !data.bankAccountId) return { ok: false, message: 'Select a bank account for bank collections.' };

    const occ = occupancyKey(agreement);
    const occDues = rentalDues.filter(d => d.occupancyId === occ);
    const outstanding = occDues.reduce((sum, d) => sum + dueOutstanding(d), 0);
    if (outstanding <= 0) return { ok: false, message: 'There are no outstanding dues for this occupancy.' };
    if (data.amount > outstanding) {
      return { ok: false, message: `Amount exceeds the outstanding balance of ₹${outstanding.toLocaleString('en-IN')}.` };
    }

    const { next, allocations } = allocatePayment(occDues, data.amount);
    const nextById = new Map(next.map(d => [d.id, d]));
    const rent = allocations.reduce((s, a) => s + a.rent, 0);
    const maintenance = allocations.reduce((s, a) => s + a.maintenance, 0);
    const receiptNumber = `${masterData.receiptPrefix}${Date.now().toString().slice(-6)}`;
    const tenantName = getProfileById(agreement.tenantProfileId)?.name || 'Tenant';
    const months = allocations.map(a => a.month);

    postCentralTransaction({
      amount: data.amount,
      direction: 'receipt',
      mode: data.mode,
      bankAccountId: data.bankAccountId,
      classification: 'accounted',
      sourceModule: 'Rental',
      sourceRecordId: agreement.id,
      partyName: tenantName,
      description: `Rental collection ${receiptNumber} for ${months[0]}${months.length > 1 ? ` – ${months[months.length - 1]}` : ''} (Rent ₹${rent}, Maintenance ₹${maintenance})${data.transactionRef ? ` Ref ${data.transactionRef}` : ''}`,
      remarks: data.narration,
      date: data.date,
    });

    const collection: RentCollection = {
      id: `RC-${Date.now().toString().slice(-6)}`,
      agreementId: agreement.id,
      occupancyId: occ,
      childPropertyId: agreement.childPropertyId,
      tenantProfileId: agreement.tenantProfileId,
      collectionType: agreement.collectionType,
      rentAmount: rent,
      maintenanceAmount: maintenance,
      totalAmount: data.amount,
      paymentMode: data.mode,
      bankAccountId: data.bankAccountId,
      date: data.date,
      forMonthYear: months.join(', '),
      transactionRef: data.transactionRef,
      narration: data.narration,
      allocations,
      receiptNumber,
      collectedBy: userName,
      timestamp: new Date().toISOString(),
    };
    setRentCollections(prev => [collection, ...prev]);
    setRentalDues(prev => prev.map(d => nextById.get(d.id) || d));

    addAuditLog('COLLECT_RENTAL_PAYMENT', 'Rental', 'Collection', collection.id, `Collected ₹${data.amount.toLocaleString('en-IN')} from ${tenantName} (${receiptNumber})`);
    return { ok: true, id: receiptNumber };
  };

  const settlementTarget = (s: RentalSettlement) =>
    s.refundableAmount > 0
      ? { amount: s.refundableAmount, direction: 'payment' as const }
      : { amount: s.payableByTenant, direction: 'receipt' as const };

  const settlementStatusOf = (s: RentalSettlement, settled: number): RentalSettlement['status'] => {
    const target = settlementTarget(s).amount;
    if (target <= 0 || settled >= target) return 'settled';
    return settled > 0 ? 'partially_settled' : 'pending';
  };

  const settlementFigures = (deposit: number, rent: number, maint: number, other: number, deductions: number) => {
    const net = deposit - rent - maint - other - deductions;
    return { refundableAmount: Math.max(0, net), payableByTenant: Math.max(0, -net) };
  };

  const postSettlementPayment = (
    s: RentalSettlement,
    p: Omit<RentalSettlementPayment, 'direction'>
  ): RentalSettlement => {
    const { direction } = settlementTarget(s);
    postCentralTransaction({
      amount: p.amount,
      direction,
      mode: p.mode,
      bankAccountId: p.bankAccountId,
      classification: 'accounted',
      sourceModule: 'Rental',
      sourceRecordId: s.id,
      partyName: getProfileById(s.tenantProfileId)?.name || 'Tenant',
      description: direction === 'payment'
        ? `Refund of security deposit/advance on exit (settlement ${s.id})`
        : `Exit dues paid by tenant (settlement ${s.id})`,
      remarks: p.reference,
      date: p.date,
    });
    const settledAmount = s.settledAmount + p.amount;
    return {
      ...s,
      settledAmount,
      payments: [...s.payments, { ...p, direction }],
      status: settlementStatusOf(s, settledAmount),
    };
  };

  const finalizeOccupancy = (agreement: RentalAgreement, settlementId: string) => {
    const occ = occupancyKey(agreement);
    const child = childProperties.find(c => c.id === agreement.childPropertyId);
    setRentalAgreements(prev => prev.map(a => a.id === agreement.id ? { ...a, status: 'closed' as const } : a));
    setChildProperties(prev => prev.map(cp => cp.id === agreement.childPropertyId
      ? { ...cp, status: 'vacant', currentTenantProfileId: undefined, vacancyDays: 1 }
      : cp));
    syncParentRollup(child?.parentPropertyId, -1);
    // Unpaid dues are carried into the settlement; history of every due is preserved.
    setRentalDues(prev => prev.map(d =>
      d.occupancyId === occ && dueOutstanding(d) > 0 ? { ...d, closedInSettlement: settlementId } : d));
  };

  const exitOccupancy = (agreementId: string, data: OccupancyExitInput): ActionResult => {
    const agreement = rentalAgreements.find(a => a.id === agreementId);
    if (!agreement || agreement.status !== 'active') return { ok: false, message: 'Only an active occupancy can be closed.' };
    if (rentalSettlements.some(s => s.agreementId === agreementId && !s.handoverConfirmed)) {
      return { ok: false, message: 'A settlement is already in progress for this occupancy. Confirm handover from the settlement record.' };
    }
    if (!data.vacatingDate) return { ok: false, message: 'Enter the vacating date.' };
    if ((data.deductions || 0) > 0 && !data.deductionDescription.trim()) {
      return { ok: false, message: 'A description is mandatory when deductions are applied.' };
    }

    const occ = occupancyKey(agreement);
    const open = rentalDues.filter(d => d.occupancyId === occ && !d.closedInSettlement);
    const pendingRent = open.reduce((s, d) => s + Math.max(0, d.rentDue - d.rentPaid), 0);
    const pendingMaintenance = open.reduce((s, d) => s + Math.max(0, d.maintenanceDue - d.maintenancePaid), 0);
    const refundableDeposit = (agreement.securityDeposit || 0) + (agreement.advanceAmount || 0);
    const figures = settlementFigures(refundableDeposit, pendingRent, pendingMaintenance, data.otherDues || 0, data.deductions || 0);

    const id = `SET-${new Date().getFullYear()}-${String(nextSequence(rentalSettlements.map(s => s.id))).padStart(2, '0')}`;
    let settlement: RentalSettlement = {
      id,
      agreementId,
      occupancyId: occ,
      childPropertyId: agreement.childPropertyId,
      tenantProfileId: agreement.tenantProfileId,
      occupancyType: agreement.occupancyType || 'rental',
      vacatingDate: data.vacatingDate,
      pendingRent,
      pendingMaintenance,
      otherDues: data.otherDues || 0,
      refundableDeposit,
      deductions: data.deductions || 0,
      deductionDescription: data.deductionDescription.trim(),
      ...figures,
      paymentMode: data.paymentMode,
      bankAccountId: data.bankAccountId,
      settledAmount: 0,
      status: 'pending',
      handoverConfirmed: data.handoverConfirmed,
      leaseTerms: agreement.leaseTerms,
      payments: [],
      createdAt: new Date().toISOString(),
      createdBy: userName,
    };
    settlement.status = settlementStatusOf(settlement, 0);

    const target = settlementTarget(settlement).amount;
    if ((data.initialPayment || 0) > 0) {
      if (data.initialPayment > target) return { ok: false, message: `Settlement payment exceeds the amount due (₹${target.toLocaleString('en-IN')}).` };
      if (data.paymentMode === 'bank' && !data.bankAccountId) return { ok: false, message: 'Select a bank account for the settlement payment.' };
      settlement = postSettlementPayment(settlement, {
        amount: data.initialPayment,
        date: data.vacatingDate,
        mode: data.paymentMode,
        bankAccountId: data.bankAccountId,
      });
    }

    setRentalSettlements(prev => [settlement, ...prev]);
    if (data.handoverConfirmed) finalizeOccupancy(agreement, id);

    addAuditLog('EXIT_OCCUPANCY', 'Rental', 'Settlement', id, `Exit settlement ${id} for ${agreementId}: ${figures.refundableAmount > 0 ? `refund ₹${figures.refundableAmount}` : `tenant payable ₹${figures.payableByTenant}`}${data.handoverConfirmed ? ' — occupancy closed, unit vacant' : ' — awaiting handover'}`);
    return { ok: true, id };
  };

  const confirmHandover = (settlementId: string): ActionResult => {
    const settlement = rentalSettlements.find(s => s.id === settlementId);
    if (!settlement) return { ok: false, message: 'Settlement not found.' };
    const agreement = rentalAgreements.find(a => a.id === settlement.agreementId);
    if (!agreement || agreement.status !== 'active') return { ok: false, message: 'Occupancy is already closed.' };

    // Dues may have rolled forward since the settlement was prepared: refresh the figures before closing.
    const open = rentalDues.filter(d => d.occupancyId === settlement.occupancyId && !d.closedInSettlement);
    const pendingRent = open.reduce((s, d) => s + Math.max(0, d.rentDue - d.rentPaid), 0);
    const pendingMaintenance = open.reduce((s, d) => s + Math.max(0, d.maintenanceDue - d.maintenancePaid), 0);
    const figures = settlementFigures(settlement.refundableDeposit, pendingRent, pendingMaintenance, settlement.otherDues, settlement.deductions);
    const refreshed: RentalSettlement = { ...settlement, pendingRent, pendingMaintenance, ...figures, handoverConfirmed: true };
    refreshed.status = settlementStatusOf(refreshed, refreshed.settledAmount);

    setRentalSettlements(prev => prev.map(s => s.id === settlementId ? refreshed : s));
    finalizeOccupancy(agreement, settlementId);
    addAuditLog('CONFIRM_HANDOVER', 'Rental', 'Settlement', settlementId, `Handover confirmed; occupancy ${agreement.id} closed and unit marked vacant`);
    return { ok: true, id: settlementId };
  };

  const recordSettlementPayment = (
    settlementId: string,
    payment: Omit<RentalSettlementPayment, 'direction'>
  ): ActionResult => {
    const settlement = rentalSettlements.find(s => s.id === settlementId);
    if (!settlement) return { ok: false, message: 'Settlement not found.' };
    const target = settlementTarget(settlement).amount;
    const remaining = target - settlement.settledAmount;
    if (remaining <= 0) return { ok: false, message: 'This settlement is already fully settled.' };
    if (!(payment.amount > 0)) return { ok: false, message: 'Enter an amount greater than zero.' };
    if (payment.amount > remaining) return { ok: false, message: `Amount exceeds the balance of ₹${remaining.toLocaleString('en-IN')}.` };
    if (payment.mode === 'bank' && !payment.bankAccountId) return { ok: false, message: 'Select a bank account.' };

    const updated = postSettlementPayment(settlement, payment);
    setRentalSettlements(prev => prev.map(s => s.id === settlementId ? updated : s));
    addAuditLog('SETTLEMENT_PAYMENT', 'Rental', 'Settlement', settlementId, `Recorded ₹${payment.amount.toLocaleString('en-IN')} against settlement ${settlementId}`);
    return { ok: true, id: settlementId };
  };

  // =========================================================================
  // MODULE 4: EXPENSE MANAGEMENT
  // =========================================================================
  const createExpenseCategory = (name: string): ExpenseCategory => {
    const newCategory: ExpenseCategory = {
      id: `EXP-CAT-${Date.now().toString().slice(-5)}`,
      name,
      isSystemDefault: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setExpenseCategories(prev => [...prev, newCategory]);
    addAuditLog('CREATE_EXPENSE_CATEGORY', 'Expense', 'Category', newCategory.id, `Created user-defined category: ${name}`);
    return newCategory;
  };

  const recordExpense = (data: Omit<ExpenseRecord, 'id' | 'postedAt' | 'enteredBy'>): string => {
    const newId = `EXP-2026-${String(expenses.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    // Post immediately to CTE (Payment)
    postCentralTransaction({
      amount: data.amount,
      direction: 'payment',
      mode: data.paymentMode,
      bankAccountId: data.bankAccountId,
      classification: data.classification,
      sourceModule: 'Expense',
      sourceRecordId: newId,
      partyName: data.categoryName || 'Expense',
      description: `Expense: ${data.categoryName || 'General'} - ${data.remarks || data.description || ''}`,
      // Rental property expenses are posted on the date the expense was incurred.
      date: data.parentPropertyId ? data.date : undefined,
    });

    const newExpense: ExpenseRecord = {
      ...data,
      id: newId,
      enteredBy: userName,
      postedAt: now,
    };
    setExpenses(prev => [newExpense, ...prev]);

    addAuditLog('RECORD_EXPENSE', 'Expense', 'ExpenseRecord', newId, `Recorded expense of ₹${data.amount.toLocaleString('en-IN')} under ${data.categoryName || 'General'}`);
    return newId;
  };

  // =========================================================================
  // MODULE 5: INVESTMENT MANAGEMENT
  // =========================================================================
  const recordInvestment = (data: Omit<InvestmentRecord, 'id' | 'totalInstalmentsPaid'>) => {
    const newId = `INV-2026-${String(investments.length + 1).padStart(2, '0')}`;
    const newInvestment: InvestmentRecord = {
      ...data,
      id: newId,
      totalInstalmentsPaid: data.isRecurring ? (data.recurringInstalmentAmount || 0) : data.amount,
    };
    setInvestments(prev => [newInvestment, ...prev]);

    // Initial posting via CTE
    postCentralTransaction({
      amount: data.isRecurring ? (data.recurringInstalmentAmount || data.amount) : data.amount,
      direction: 'payment',
      mode: 'bank',
      bankAccountId: bankAccounts[0].id,
      classification: 'accounted',
      sourceModule: 'Investment',
      sourceRecordId: newId,
      partyName: data.companyOrOrg || data.institutionName || 'Investment',
      description: `Investment allocation for ${data.name || data.investmentName || 'Asset'}`,
    });

    addAuditLog('RECORD_INVESTMENT', 'Investment', 'InvestmentRecord', newId, `Registered business investment ${data.name || data.investmentName} for ₹${data.amount.toLocaleString('en-IN')}`);
  };

  const payInvestmentInstalment = (investmentId: string, amount: number, mode: PaymentMode, bankAccountId?: string) => {
    const inv = investments.find(i => i.id === investmentId);
    if (!inv || inv.status !== 'active') return;

    postCentralTransaction({
      amount,
      direction: 'payment',
      mode,
      bankAccountId,
      classification: 'accounted',
      sourceModule: 'Investment',
      sourceRecordId: investmentId,
      partyName: inv.companyOrOrg || inv.institutionName || 'Investment',
      description: `Recurring investment instalment for ${inv.name || inv.investmentName}`,
    });

    setInvestments(prev => prev.map(i => {
      if (i.id === investmentId) {
        return {
          ...i,
          totalInstalmentsPaid: i.totalInstalmentsPaid + amount,
        };
      }
      return i;
    }));

    addAuditLog('PAY_INVESTMENT_INSTALMENT', 'Investment', 'InvestmentRecord', investmentId, `Paid recurring instalment ₹${amount.toLocaleString('en-IN')} for ${inv.name || inv.investmentName}`);
  };

  const closeInvestment = (investmentId: string, finalAmount: number, mode: PaymentMode, bankAccountId?: string) => {
    const inv = investments.find(i => i.id === investmentId);
    if (!inv) return;

    // Post receipt of matured funds via CTE
    postCentralTransaction({
      amount: finalAmount,
      direction: 'receipt',
      mode,
      bankAccountId,
      classification: 'accounted',
      sourceModule: 'Investment',
      sourceRecordId: investmentId,
      partyName: inv.companyOrOrg || inv.institutionName || 'Investment',
      description: `Final maturity settlement received for ${inv.name || inv.investmentName}`,
    });

    setInvestments(prev => prev.map(i => {
      if (i.id === investmentId) {
        return {
          ...i,
          status: 'closed',
          finalAmountReceived: finalAmount,
          closedAt: new Date().toISOString(),
          closedBy: userName,
        };
      }
      return i;
    }));

    addAuditLog('CLOSE_INVESTMENT', 'Investment', 'InvestmentRecord', investmentId, `Closed investment ${inv.name}. Matured receipt ₹${finalAmount.toLocaleString('en-IN')}`);
  };

  // =========================================================================
  // MODULE 6: RECEIVABLES & PAYABLES
  // =========================================================================
  const recordReceivable = (data: Omit<ReceivableItem, 'id' | 'accruedPenalty' | 'totalDue' | 'paidAmount' | 'balanceOutstanding' | 'status' | 'createdAt'>) => {
    const newId = `REC-2026-${String(receivables.length + 1).padStart(2, '0')}`;
    const newReceivable: ReceivableItem = {
      ...data,
      id: newId,
      accruedPenalty: 0,
      totalDue: data.amount,
      paidAmount: 0,
      balanceOutstanding: data.amount,
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setReceivables(prev => [newReceivable, ...prev]);
    addAuditLog('CREATE_RECEIVABLE', 'Receivables & Payables', 'Receivable', newId, `Raised receivable ₹${data.amount.toLocaleString('en-IN')} against ${data.partyName}`);
  };

  const recordReceivablePayment = (id: string, amount: number, mode: PaymentMode, bankAccountId?: string) => {
    const item = receivables.find(r => r.id === id);
    if (!item) return;

    postCentralTransaction({
      amount,
      direction: 'receipt',
      mode,
      bankAccountId,
      classification: item.classification,
      sourceModule: 'Receivables & Payables',
      sourceRecordId: id,
      partyName: item.partyName,
      description: `Settlement collection for Receivable ${id}`,
    });

    setReceivables(prev => prev.map(r => {
      if (r.id === id) {
        const newPaid = r.paidAmount + amount;
        const newBal = Math.max(0, r.totalDue - newPaid);
        return {
          ...r,
          paidAmount: newPaid,
          balanceOutstanding: newBal,
          status: newBal === 0 ? 'settled' : 'partially_paid',
        };
      }
      return r;
    }));

    addAuditLog('COLLECT_RECEIVABLE', 'Receivables & Payables', 'Receivable', id, `Collected ₹${amount.toLocaleString('en-IN')} towards receivable ${id}`);
  };

  const recordPayable = (data: Omit<PayableItem, 'id' | 'paidAmount' | 'balanceOutstanding' | 'status' | 'createdAt'>) => {
    const newId = `PAY-2026-${String(payables.length + 1).padStart(2, '0')}`;
    const newPayable: PayableItem = {
      ...data,
      id: newId,
      paidAmount: 0,
      balanceOutstanding: data.amount,
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setPayables(prev => [newPayable, ...prev]);
    addAuditLog('CREATE_PAYABLE', 'Receivables & Payables', 'Payable', newId, `Raised payable ₹${data.amount.toLocaleString('en-IN')} to ${data.partyName}`);
  };

  const recordPayablePayment = (id: string, amount: number, mode: PaymentMode, bankAccountId?: string) => {
    const item = payables.find(p => p.id === id);
    if (!item) return;

    postCentralTransaction({
      amount,
      direction: 'payment',
      mode,
      bankAccountId,
      classification: item.classification,
      sourceModule: 'Receivables & Payables',
      sourceRecordId: id,
      partyName: item.partyName,
      description: `Payment settlement for Payable ${id}`,
    });

    setPayables(prev => prev.map(p => {
      if (p.id === id) {
        const newPaid = p.paidAmount + amount;
        const newBal = Math.max(0, p.amount - newPaid);
        return {
          ...p,
          paidAmount: newPaid,
          balanceOutstanding: newBal,
          status: newBal === 0 ? 'settled' : 'partially_paid',
        };
      }
      return p;
    }));

    addAuditLog('PAY_PAYABLE', 'Receivables & Payables', 'Payable', id, `Paid ₹${amount.toLocaleString('en-IN')} towards payable ${id}`);
  };

  // =========================================================================
  // SHARED SERVICES: DOCUMENTS, NOTIFICATIONS, RESET
  // =========================================================================
  const uploadDocument = (doc: Omit<DocumentItem, 'id' | 'uploadedAt' | 'uploadedBy'>) => {
    const newDoc: DocumentItem = {
      ...doc,
      id: `DOC-${Date.now().toString().slice(-6)}`,
      uploadedBy: userName,
      uploadedAt: new Date().toISOString(),
    };
    setDocuments(prev => [newDoc, ...prev]);
    addAuditLog('UPLOAD_DOCUMENT', 'Platform', 'Document', newDoc.id, `Uploaded ${doc.docType} (${doc.fileName}) for ${doc.entityType} ${doc.entityId}`);
  };

  const deleteDocument = (docId: string): boolean => {
    if (userRole !== 'admin') {
      alert('Role Enforcement: Document deletion is restricted to Administrator only.');
      return false;
    }
    setDocuments(prev => prev.filter(d => d.id !== docId));
    addAuditLog('DELETE_DOCUMENT', 'Platform', 'Document', docId, `Administrator deleted document ${docId}`);
    return true;
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const resetAllData = () => {
    localStorage.clear();
    setMasterData(INITIAL_MASTER_DATA);
    setProfiles(INITIAL_PROFILES);
    setBankAccounts(INITIAL_BANK_ACCOUNTS);
    setCashBook(INITIAL_CASH_BOOK);
    setBankBook(INITIAL_BANK_BOOK);
    setCentralLedger(INITIAL_CENTRAL_LEDGER);
    setLoans(INITIAL_LOANS);
    setChitSchemes(INITIAL_CHIT_SCHEMES);
    setChitGroups(INITIAL_CHIT_GROUPS);
    setChitMembers(INITIAL_CHIT_MEMBERS);
    setAuctionRecords([]);
    setParentProperties(INITIAL_PARENT_PROPERTIES);
    setChildProperties(INITIAL_CHILD_PROPERTIES);
    setRentalAgreements(INITIAL_AGREEMENTS);
    setRentCollections([]);
    setRentalDues([]);
    setRentalSettlements([]);
    setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
    setExpenses(INITIAL_EXPENSES);
    setInvestments(INITIAL_INVESTMENTS);
    setReceivables(INITIAL_RECEIVABLES);
    setPayables(INITIAL_PAYABLES);
    setDocuments(INITIAL_DOCUMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setUserRoleState('admin');
    window.location.reload();
  };

  return (
    <ERPContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        userRole,
        userName,
        setUserRole,
        toggleRole,
        isTelegramVerified,
        verifyTelegramOtp,
        masterData,
        updateMasterData,
        profiles,
        createProfile,
        updateProfile,
        getProfileById,
        bankAccounts,
        updateBankAccount,
        addBankAccount,
        reverseTransaction,
        cashBook,
        bankBook,
        centralLedger,
        totalCashBalance,
        totalBankBalance,
        postCentralTransaction,
        loans,
        createLoanApplication,
        updateLoan,
        sanctionLoan,
        rejectLoan,
        disburseLoan,
        collectLoanPayment,
        topUpLoan,
        closeLoan,
        chitSchemes,
        chitGroups,
        chitMembers,
        auctionRecords,
        createChitScheme,
        createChitGroup,
        updateChitScheme,
        deleteChitScheme,
        updateChitGroup,
        activateChitGroup,
        enrollChitMember,
        collectChitInstallment,
        recordAuctionWinner,
        closeChitGroup,
        parentProperties,
        childProperties,
        rentalAgreements,
        rentCollections,
        rentalDues,
        rentalSettlements,
        allocateTenant,
        uploadAgreementDocument,
        renewAgreement,
        collectRentalPayment,
        exitOccupancy,
        confirmHandover,
        recordSettlementPayment,
        createParentProperty,
        createProperty,
        updateParentProperty,
        deleteParentProperty,
        updateChildProperty,
        deleteChildProperty,
        createRentalAgreement,
        updateRentalAgreement,
        reviseRent,
        renewLease,
        collectRent,
        closeLease,
        expenseCategories,
        expenses,
        createExpenseCategory,
        updateExpenseCategory,
        recordExpense,
        investments,
        recordInvestment,
        updateInvestment,
        payInvestmentInstalment,
        closeInvestment,
        receivables,
        payables,
        recordReceivable,
        updateReceivable,
        recordReceivablePayment,
        recordPayable,
        updatePayable,
        recordPayablePayment,
        documents,
        uploadDocument,
        deleteDocument,
        auditLogs,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
        sendTelegramSimulatedAlert,
        resetAllData,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = (): ERPContextType => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
