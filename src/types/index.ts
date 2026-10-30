export type UserRole = 'admin' | 'employee';

export interface UserSession {
  username: string;
  name: string;
  role: UserRole;
  isLoggedIn: boolean;
  token?: string;
}

export type ProfileType = 'borrower' | 'subscriber' | 'tenant' | 'vendor' | 'partner' | 'other';

export interface Profile {
  id: string; // e.g. P000101
  name: string;
  fullName?: string; // alias for name
  nickname?: string;
  fatherName?: string; // Father's or Husband's Name
  husbandName?: string;
  dob?: string; // YYYY-MM-DD
  age?: number; // Age in years
  occupation?: string; // Occupation / Profession
  officeAddress?: string; // Office / Business Address
  address: string; // Residential Address
  residentialAddress?: string; // alias for address
  permanentAddress?: string; // Permanent Address
  mobile: string;
  phone?: string; // Phone number
  primaryPhone?: string; // alias for mobile
  email?: string;
  annualIncome?: number; // Annual Income in INR
  aadhaar: string;
  aadhaarNumber?: string; // alias
  pan: string;
  panNumber?: string; // alias
  referenceName?: string;
  referenceContact?: string;
  photoUrl?: string;
  profileType?: ProfileType;
  isKycVerified?: boolean;
  createdAt: string;
}

export type TransactionClassification = 'accounted' | 'non_accounted';
export type AccountingStream = TransactionClassification;
export type PaymentMode = 'cash' | 'bank';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  ifscCode?: string; // alias
  accountType: 'Current' | 'Savings' | 'Overdraft';
  openingBalance: number;
  currentBalance: number;
  status: 'active' | 'inactive';
}

export interface CashBookEntry {
  id: string;
  date: string;
  amount: number;
  direction: 'receipt' | 'payment';
  classification: TransactionClassification;
  sourceModule: 'Finance' | 'Chit Fund' | 'Rental' | 'Expense' | 'Investment' | 'Receivables & Payables' | 'General' | string;
  sourceRecordId: string;
  partyName: string;
  enteredBy: string;
  timestamp: string;
  runningBalance: number;
  remarks?: string;
}

export interface BankBookEntry {
  id: string;
  date: string;
  bankAccountId: string;
  bankName: string;
  amount: number;
  direction: 'receipt' | 'payment';
  classification: TransactionClassification;
  sourceModule: 'Finance' | 'Chit Fund' | 'Rental' | 'Expense' | 'Investment' | 'Receivables & Payables' | 'General' | string;
  sourceRecordId: string;
  partyName: string;
  enteredBy: string;
  timestamp: string;
  runningBalance: number;
  remarks?: string;
}

export interface CentralLedgerEntry {
  id: string;
  date: string;
  amount: number;
  direction: 'receipt' | 'payment';
  transactionType?: 'credit' | 'debit'; // alias
  mode: PaymentMode;
  bankAccountId?: string;
  bankName?: string;
  classification: TransactionClassification;
  stream?: TransactionClassification; // alias
  sourceModule: string;
  module?: string; // alias
  sourceRecordId: string;
  partyName: string;
  description: string;
  accountCode?: string;
  enteredBy: string;
  timestamp: string;
}

export interface DocumentItem {
  id: string;
  entityType: 'profile' | 'loan' | 'chit_group' | 'property' | 'investment' | 'expense' | 'receivable_payable' | 'chit_member' | 'general' | string;
  entityId: string;
  docType?: string;
  title?: string;
  fileName: string;
  fileType?: string;
  fileSize: string;
  fileUrl?: string;
  module?: string;
  partyProfileId?: string;
  uploadedBy: string;
  uploadedAt: string;
  isMandatory?: boolean;
}

export interface TopUpEntry {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  approvedBy: string;
  disbursementMode: PaymentMode;
  disbursingBankId?: string;
  remarks: string;
}

export type CollateralType = 'gold' | 'vehicle' | 'other';

export interface CollateralItem {
  id: string;
  type: CollateralType;
  // Gold
  netWeight?: number | string;
  grossWeight?: number | string;
  carat?: string;
  // Vehicle
  brand?: string;
  model?: string;
  possession?: 'with' | 'without';
  rcBookFileName?: string;
  // Other Asset
  assetTitle?: string;
  assetValue?: number | string;
  documentFileName?: string;
}

export interface CollectionScheduleItem {
  installmentNumber: number;
  dueDate: string;
  principal: number;
  interest: number;
  officialInterest?: number;
  operationalInterest?: number;
  penalty: number;
  totalDue: number;
  amountPaid: number;
  balance: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'BOUNCED' | 'PARTIAL';
  overdueDays?: number;
}

export interface Loan {
  id: string; // LN-2026-001
  profileId: string;
  borrowerProfileId?: string; // alias
  guarantor1ProfileId?: string;
  guarantor2ProfileId?: string;
  coBorrowerProfileId?: string;
  borrowerSnapshot?: Profile;
  coBorrowerSnapshot?: Profile;
  guarantor1Snapshot?: Profile;
  guarantor2Snapshot?: Profile;
  natureOfFacilities?: string;
  purposeOfLoan?: string;
  sourcesOfRepayment?: string;
  applicationPlace?: string;
  applicationDate?: string;
  principalAmount: number;
  deductedAmount?: number;
  manualPenalty?: number;
  pendingPrincipal: number;
  collateralDetails: string;
  collateralItems?: CollateralItem[];
  repaymentTerms: string;
  collectionFrequency: 'daily' | 'weekly' | 'monthly';
  firstCollectionDate: string;
  nextDueDate?: string;
  monthlyEmi?: number;
  officialInterestRate: number; // e.g. 12% annual or 1% monthly
  officialInterestRatePercent?: number; // alias
  officialInterestFrequency: 'monthly' | 'annual';
  nonAccountedInterestRate: number; // e.g. 6% operational
  nonAccountedInterestRatePercent?: number; // alias
  nonAccountedInterestFrequency: 'monthly' | 'annual';
  status: 'pending_approval' | 'sanctioned' | 'active' | 'npa' | 'closed';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvalDate?: string;
  approvalRemarks?: string;
  disbursementDate?: string;
  disbursementMode?: PaymentMode;
  disbursingBankId?: string;
  closureDate?: string;
  closedBy?: string;
  topUpHistory: TopUpEntry[];
  totalOfficialInterestCollected: number;
  totalNonAccountedInterestCollected: number;
  totalPrincipalCollected: number;
  totalPenaltyCollected: number;
  lastPaymentDate?: string;
  isNpa?: boolean;
  collectionSchedule?: CollectionScheduleItem[];
}

export interface LoanCollectionEntry {
  id: string;
  loanId: string;
  date: string;
  amount: number;
  principalAllocated: number;
  officialInterestAllocated: number;
  nonAccountedInterestAllocated: number;
  penaltyAllocated: number;
  otherChargesAllocated: number;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  collectedBy: string;
  receiptNumber: string;
  remarks?: string;
  timestamp: string;
}

export interface ChitScheme {
  id: string;
  name: string;
  schemeName?: string; // alias
  isDividendType: boolean;
  description: string;
  poolSize?: number;
  totalPoolValue?: number; // alias
  durationMonths?: number;
  monthlyBaseInstallment?: number;
  monthlyInstallment?: number; // alias
  maxMembers?: number;
  maxSubscribers?: number; // alias
  commissionPercent?: number;
  foremanCommissionPercent?: number; // alias
}

export interface ChitGroup {
  id: string; // CG-2026-01
  schemeId: string;
  schemeName: string;
  groupName?: string; // alias
  startDate: string;
  startMonthYear?: string;
  durationMonths: number;
  monthlyInstallment: number;
  currentInstallmentAmount: number;
  currentMonthlyCollection?: number; // alias
  poolSize?: number;
  collectionFrequency: 'monthly';
  memberCapacity: number;
  maxMembers?: number; // alias
  enrolledMembersCount: number;
  penaltyPercentage: number;
  dividendStructureDescription: string;
  status: 'draft' | 'pending_approval' | 'active' | 'closing' | 'closed' | 'forming' | 'in_progress' | 'completed';
  approvedBy?: string;
  currentCycle: number;
  currentMonth?: number; // alias
  nextAuctionDate?: string;
}

export interface ChitMember {
  id: string;
  groupId: string;
  chitGroupId?: string; // alias
  profileId: string;
  joinDate: string;
  isKycVerified: boolean;
  totalPaid: number;
  pendingDue: number;
  pendingDues?: number; // alias
  penaltyDue: number;
  hasWonAuction: boolean;
  isPrized?: boolean; // alias
  wonCycle?: number;
  wonAuctionMonth?: number; // alias
  prizedMonth?: number; // alias
  prizeAmountWon?: number;
  ticketNumber?: number;
  totalDividendEarned?: number;
}

export interface ChitInstallment {
  id: string;
  groupId: string;
  chitGroupId?: string; // alias
  memberId: string;
  profileId: string;
  cycleNumber: number;
  amount: number;
  penaltyAmount: number;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  date: string;
  collectedBy: string;
  receiptNumber: string;
  timestamp: string;
}

export interface AuctionRecord {
  id: string;
  groupId: string;
  chitGroupId?: string; // alias
  cycleNumber: number;
  auctionMonth?: number; // alias
  monthNumber?: number; // alias
  auctionDate: string;
  winnerProfileId: string;
  winnerName?: string;
  bidPrizeAmount: number;
  bidAmount?: number; // alias
  prizeAmount?: number; // alias
  foremanCommission?: number;
  disbursementMode: PaymentMode;
  disbursingBankId?: string;
  calculatedNextCollection: number;
  nextMonthInstallment?: number; // alias
  dividendPerMember: number;
  announcedAt: string;
  enteredBy: string;
}

export interface ParentProperty {
  id: string;
  name: string;
  address: string;
  propertyType: 'commercial' | 'residential' | 'mixed';
  ownership: string;
  description?: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  expectedMonthlyRent: number;
  totalOutstanding: number;
}

export interface ChildProperty {
  id: string;
  parentPropertyId?: string;
  parentPropertyName?: string;
  unitNumber: string;
  propertyType?: 'residential' | 'commercial';
  floor: string;
  description?: string;
  squareFeet?: number;
  standardRent?: number;
  standardMaintenance?: number;
  amenities?: string[];
  status: 'occupied' | 'vacant' | 'maintenance';
  rentAmount: number;
  maintenanceAmount: number;
  currentTenantProfileId?: string;
  vacancyDays?: number;
}

export type OccupancyType = 'rental' | 'lease';
export type AgreementDocumentStatus = 'uploaded' | 'pending_upload';

export interface RentalAgreement {
  id: string;
  /** Stable id for a continuous tenancy; renewals keep the occupancyId of the original agreement. */
  occupancyId?: string;
  previousAgreementId?: string;
  childPropertyId: string;
  tenantProfileId: string;
  occupancyType?: OccupancyType; // legacy records are treated as 'rental'
  rentAmount: number;
  monthlyRent?: number; // alias
  /** Lease only: total lease amount agreed. */
  leaseAmount?: number;
  /** Lease only: payment terms / agreed lease settlement terms. */
  leaseTerms?: string;
  securityDeposit: number;
  advanceAmount?: number;
  maintenanceAmount: number;
  monthlyMaintenance?: number; // alias
  collectionType: 'rent_only' | 'maintenance_only' | 'combined';
  agreementDate?: string;
  occupancyStartDate?: string;
  occupants?: number;
  startDate: string; // commencement date
  endDate: string; // expiry date
  /** First month (YYYY-MM) for which monthly dues are generated. */
  billingStartMonth?: string;
  escalationPercentage?: number;
  dueDayOfMonth?: number;
  status: 'active' | 'expired' | 'terminated' | 'renewed' | 'closed';
  agreementDocumentUrl?: string;
  agreementDocumentName?: string;
  documentStatus?: AgreementDocumentStatus;
  depositPaymentMode?: PaymentMode;
  depositBankAccountId?: string;
}

export interface RentCollection {
  id: string;
  agreementId: string;
  occupancyId?: string;
  childPropertyId: string;
  tenantProfileId: string;
  collectionType: 'rent_only' | 'maintenance_only' | 'combined';
  rentAmount: number;
  maintenanceAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  mode?: PaymentMode; // alias
  bankAccountId?: string;
  date: string;
  collectionDate?: string; // alias
  forMonthYear?: string;
  transactionRef?: string;
  narration?: string;
  /** How this payment was applied across monthly dues (oldest first). */
  allocations?: { dueId: string; month: string; rent: number; maintenance: number }[];
  receiptNumber: string;
  collectedBy: string;
  timestamp: string;
}

export interface TenantAllocationInput {
  childPropertyId: string;
  tenantProfileId: string;
  occupancyType: OccupancyType;
  occupancyStartDate: string;
  occupants: number;
  rentAmount: number; // monthly rent (rental only)
  leaseAmount?: number; // lease only
  leaseTerms?: string;
  maintenanceAmount: number;
  securityDeposit: number;
  advanceAmount: number;
  dueDayOfMonth: number;
  agreementDate?: string;
  startDate: string;
  endDate: string;
  documentName?: string;
  documentSize?: string;
  recordDeposit: boolean; // post the deposit/advance receipt to the Cash/Bank Book now
  paymentMode: PaymentMode;
  bankAccountId?: string;
}

export interface AgreementRenewalInput {
  agreementDate?: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  leaseAmount?: number;
  leaseTerms?: string;
  maintenanceAmount: number;
  securityDeposit: number;
  dueDayOfMonth: number;
  documentName?: string;
  documentSize?: string;
}

export interface RentalPaymentInput {
  childPropertyId: string;
  amount: number;
  date: string;
  mode: PaymentMode;
  bankAccountId?: string;
  transactionRef?: string;
  narration?: string;
}

export interface OccupancyExitInput {
  vacatingDate: string;
  otherDues: number;
  deductions: number;
  deductionDescription: string;
  handoverConfirmed: boolean;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  initialPayment: number;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

/** One monthly charge for a tenancy. Rental = rent + maintenance, Lease = maintenance only. */
export interface RentalDue {
  id: string;
  occupancyId: string;
  agreementId: string;
  childPropertyId: string;
  tenantProfileId: string;
  occupancyType: OccupancyType;
  month: string; // YYYY-MM
  dueDate: string;
  rentDue: number;
  maintenanceDue: number;
  rentPaid: number;
  maintenancePaid: number;
  /** Set when the occupancy was closed and this due was carried into the settlement. */
  closedInSettlement?: string;
}

export interface RentalSettlementPayment {
  date: string;
  amount: number;
  direction: 'receipt' | 'payment';
  mode: PaymentMode;
  bankAccountId?: string;
  reference?: string;
}

export interface RentalSettlement {
  id: string;
  agreementId: string;
  occupancyId: string;
  childPropertyId: string;
  tenantProfileId: string;
  occupancyType: OccupancyType;
  vacatingDate: string;
  pendingRent: number;
  pendingMaintenance: number;
  otherDues: number;
  /** Refundable security deposit + advance (a liability, not rental income). */
  refundableDeposit: number;
  deductions: number;
  deductionDescription: string;
  refundableAmount: number;
  payableByTenant: number;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  settledAmount: number;
  status: 'pending' | 'partially_settled' | 'settled';
  handoverConfirmed: boolean;
  leaseTerms?: string;
  payments: RentalSettlementPayment[];
  createdAt: string;
  createdBy: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isSystemDefault?: boolean;
  createdAt?: string;
}

export interface ExpenseRecord {
  id: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  date: string;
  expenseDate?: string; // alias
  paymentMode: PaymentMode;
  bankAccountId?: string;
  remarks?: string;
  description?: string; // alias
  payeeName?: string;
  invoiceNumber?: string;
  isRecurring: boolean;
  recurrenceFrequency?: 'monthly' | 'quarterly' | 'annual';
  recurringFrequency?: 'monthly' | 'quarterly' | 'annually'; // alias
  classification: TransactionClassification;
  stream?: TransactionClassification; // alias
  /** Rental property expenses: common-building costs link to the parent, unit costs to the child. */
  parentPropertyId?: string;
  childPropertyId?: string;
  paidTo?: string;
  transactionRef?: string;
  supportingDocName?: string;
  enteredBy: string;
  postedAt: string;
}

export type InvestmentType = 'fixed_deposit' | 'shares' | 'bond' | 'loan' | 'mutual_funds' | 'mutual_fund' | 'recurring_deposit' | 'land_property' | 'other' | 'others';

export interface InvestmentRecord {
  id: string;
  name: string;
  investmentName?: string; // alias
  companyOrOrg?: string;
  institutionName?: string; // alias
  accountOrFolioNumber?: string;
  investmentType: InvestmentType;
  amount: number;
  principalAmount?: number; // alias
  interestRatePercent?: number;
  investmentDate?: string;
  startDate?: string; // alias
  category?: string;
  platform?: string;
  referenceNumber?: string;
  remarks?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  nextInstalmentDate?: string;
  recurringInstalmentAmount?: number;
  maturityDate?: string;
  expectedReturn?: number;
  expectedMaturityAmount?: number; // alias
  status: 'active' | 'closed' | 'matured';
  finalAmountReceived?: number;
  closedAt?: string;
  closedBy?: string;
  totalInstalmentsPaid: number;
  certificateUrl?: string;
  documentUrl?: string;
  paymentMode?: PaymentMode;
  bankAccountId?: string;
  customFields?: { label: string; value: string; type: 'text' | 'number' | 'date' | 'dropdown' | 'yes_no' }[];
}

export interface InvestmentInstalment {
  id: string;
  investmentId: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  enteredBy: string;
  timestamp: string;
}

export interface ReceivableItem {
  id: string;
  partyProfileId?: string;
  partyName: string;
  sourceModule?: 'Finance' | 'Chit Fund' | 'Rental' | 'Expense' | 'Investment' | 'General';
  sourceRecordId?: string;
  amount: number;
  originalAmount?: number; // alias
  accruedPenalty: number;
  totalDue: number;
  paidAmount: number;
  balanceOutstanding: number;
  dueDate: string;
  status: 'open' | 'overdue' | 'partially_paid' | 'settled' | 'paid';
  penaltyPercentage?: number;
  isPenaltyApplicable?: boolean;
  category?: string;
  remarks?: string;
  description?: string; // alias
  classification: TransactionClassification;
  stream?: TransactionClassification; // alias
  createdAt: string;
}

export interface PayableItem {
  id: string;
  partyProfileId?: string;
  partyName: string;
  sourceModule?: 'Finance' | 'Chit Fund' | 'Rental' | 'Expense' | 'Investment' | 'General';
  sourceRecordId?: string;
  amount: number;
  originalAmount?: number; // alias
  paidAmount: number;
  balanceOutstanding: number;
  dueDate: string;
  status: 'open' | 'overdue' | 'partially_paid' | 'settled' | 'paid';
  category?: string;
  remarks?: string;
  description?: string; // alias
  classification: TransactionClassification;
  stream?: TransactionClassification; // alias
  createdAt: string;
}

export interface RPPayment {
  id: string;
  rpType: 'receivable' | 'payable';
  itemId: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  recordedBy: string;
  receiptNumber: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  performedBy?: string; // alias
  actorRole: UserRole;
  userRole?: UserRole; // alias
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  details: string;
  beforeValues?: string;
  beforeState?: any; // alias
  afterValues?: string;
  afterState?: any; // alias
  ipAddress?: string;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  channel: 'telegram' | 'system';
  module: string;
  type: 'due_reminder' | 'overdue_alert' | 'payment_confirmation' | 'approval_required' | 'action_completed';
  isRead: boolean;
}

export interface MasterDataConfig {
  defaultOfficialInterestRate?: number;
  defaultNonAccountedInterestRate?: number;
  overduePenaltyRatePercent?: number;
  chitForemanCommissionPercent?: number;
  telegramBotToken?: string;
  telegramChatId?: string;
  interestTypes: { id: string; name: string; defaultRate: number }[];
  loanTypes: { id: string; name: string }[];
  collectionFrequencies: string[];
  paymentModes: string[];
  penaltyRules: { id: string; module: string; ratePercentage: number; gracePeriodDays: number }[];
  documentTypes: string[];
  mandatoryLoanDocuments: string[];
  reminderTemplates: { id: string; event: string; template: string }[];
  currency: string;
  dateFormat: string;
  financialYear: string;
  receiptPrefix: string;
}
