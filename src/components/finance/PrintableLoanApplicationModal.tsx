import React, { useRef } from 'react';
import { Loan, Profile } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer, X, ShieldCheck, Download, FileText } from 'lucide-react';

interface PrintableLoanApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Partial<Loan>;
  borrower?: Profile;
  coBorrower?: Profile;
  guarantor1?: Profile;
  guarantor2?: Profile;
  applicationPlace?: string;
  applicationDate?: string;
}

/* ============================================================================
   HELPER: Number to Words converter for Indian Rupees
   ============================================================================ */
const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  return convert(Math.round(num)) + ' Rupees Only';
};

/* ============================================================================
   HELPER: Format date as DD/MM/YYYY
   ============================================================================ */
const formatDateDMY = (dateStr?: string): string => {
  if (!dateStr) return '____/____/________';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
};

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */
export const PrintableLoanApplicationModal: React.FC<PrintableLoanApplicationModalProps> = ({
  isOpen,
  onClose,
  loan,
  borrower: propBorrower,
  coBorrower: propCoBorrower,
  guarantor1: propGuarantor1,
  guarantor2: propGuarantor2,
  applicationPlace = 'Bangalore',
  applicationDate = new Date().toISOString().slice(0, 10),
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Resolve profile snapshots (frozen at generation time)
  const borrower = loan.borrowerSnapshot || propBorrower;
  const coBorrower = loan.coBorrowerSnapshot || propCoBorrower;
  const guarantor1 = loan.guarantor1Snapshot || propGuarantor1;
  const guarantor2 = loan.guarantor2Snapshot || propGuarantor2;
  const primaryGuarantor = guarantor1 || guarantor2;

  const principalAmount = loan.principalAmount || 0;
  const amountInWords = numberToWords(principalAmount);
  const loanId = loan.id || 'LN-2026-NEW';

  const formatValue = (val?: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    return String(val);
  };

  const handlePrint = () => {
    window.print();
  };

  /* -------------------------------------------------------------------
     Photo Box Component (reusable for all 3 parties)
     ------------------------------------------------------------------- */
  const PhotoBox: React.FC<{ label: string; profile?: Profile }> = ({ label, profile }) => (
    <div style={{
      width: '72px', height: '88px', border: '1.5px dashed #94a3b8',
      backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      fontSize: '7px', textAlign: 'center', flexShrink: 0,
    }}>
      {profile?.photoUrl ? (
        <img src={profile.photoUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <>
          <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '7px' }}>{label}</span>
          <span style={{ color: '#94a3b8', marginTop: '3px', fontSize: '6.5px' }}>Affix Passport<br/>Size Photo</span>
        </>
      )}
    </div>
  );

  /* -------------------------------------------------------------------
     Signature Block Component
     ------------------------------------------------------------------- */
  const SignatureBlock: React.FC<{ label: string; name?: string }> = ({ label, name }) => (
    <div style={{
      border: '1px solid #64748b', padding: '8px', height: '70px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      textAlign: 'center', flex: 1,
    }}>
      <div style={{ fontSize: '7px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        [ Signature ]
      </div>
      <div style={{ borderTop: '1px solid #64748b', paddingTop: '4px' }}>
        <div style={{ fontWeight: 700, fontSize: '8px', color: '#0f172a' }}>{label}</div>
        {name && <div style={{ fontSize: '7px', color: '#475569' }}>{name}</div>}
      </div>
    </div>
  );

  /* -------------------------------------------------------------------
     Company Letterhead (reused on every page)
     ------------------------------------------------------------------- */
  const Letterhead: React.FC<{ subtitle?: string; showAccountNo?: boolean }> = ({ subtitle, showAccountNo = true }) => (
    <div style={{
      borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', backgroundColor: '#047857', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '11px', borderRadius: '4px', letterSpacing: '1px',
          }}>DF</div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', letterSpacing: '1px', margin: 0, textTransform: 'uppercase' }}>
              DHAVANAM FINANCE
            </h1>
            <p style={{ fontSize: '8px', color: '#64748b', margin: 0, letterSpacing: '0.5px' }}>
              PAWN BROKER & MONEY LENDING SERVICES
            </p>
          </div>
        </div>
        {subtitle && (
          <p style={{ fontSize: '8px', color: '#475569', margin: '4px 0 0 0' }}>
            No. 42, Commercial Street, Shivajinagar, Bangalore - 560001 • Tel: 080-25591000
          </p>
        )}
      </div>
      {showAccountNo && (
        <div style={{ textAlign: 'right', fontSize: '9px' }}>
          <div style={{
            backgroundColor: '#f1f5f9', padding: '3px 8px', border: '1px solid #cbd5e1',
            display: 'inline-block', fontWeight: 700, fontSize: '9px', marginBottom: '3px',
          }}>
            A/C NO: {loanId}
          </div>
          <div style={{ fontSize: '8px', color: '#475569' }}>
            Date: <strong style={{ color: '#0f172a' }}>{formatDate(applicationDate)}</strong>
          </div>
        </div>
      )}
    </div>
  );

  /* -------------------------------------------------------------------
     PDC / Cheque Registration Table (Pages 6-8)
     ------------------------------------------------------------------- */
  const PDCRegistrationPage: React.FC<{ role: string; profile?: Profile; pageNum: number }> = ({ role, profile, pageNum }) => (
    <div className="legal-page" style={pageStyle}>
      <Letterhead subtitle="PDC Registration" />

      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '1px' }}>
          {role} P.D.C. / CHEQUE REGISTRATION
        </h2>
        <p style={{ fontSize: '8px', color: '#475569', margin: 0 }}>
          Post Dated Cheque Details submitted as security for Loan A/C: <strong>{loanId}</strong>
        </p>
      </div>

      {/* Party Details */}
      <div style={{ border: '1px solid #94a3b8', padding: '8px', marginBottom: '10px', fontSize: '9px', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          <div><strong>Name:</strong> {formatValue(profile?.name)}</div>
          <div><strong>A/C No:</strong> {loanId}</div>
          <div><strong>Father's / Husband's Name:</strong> {formatValue(profile?.fatherName || profile?.husbandName)}</div>
          <div><strong>Mobile:</strong> {formatValue(profile?.mobile)}</div>
          <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {formatValue(profile?.address || profile?.residentialAddress)}</div>
        </div>
      </div>

      {/* PDC Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700, fontSize: '7.5px', textTransform: 'uppercase' }}>
            <th style={thStyle}>S.No.</th>
            <th style={thStyle}>Cheque No.</th>
            <th style={thStyle}>Bank Name</th>
            <th style={thStyle}>Branch</th>
            <th style={thStyle}>Cheque Date</th>
            <th style={thStyle}>Amount (₹)</th>
            <th style={thStyle}>Purpose</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }, (_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Declaration */}
      <div style={{ fontSize: '8px', color: '#334155', lineHeight: 1.5, marginBottom: '12px', textAlign: 'justify', border: '1px solid #cbd5e1', padding: '8px', backgroundColor: '#fefce8' }}>
        <strong>Declaration:</strong> I, <strong>{formatValue(profile?.name) || '________________________'}</strong>, hereby confirm that the above Post Dated Cheques (P.D.C.) have been issued
        by me voluntarily as security for the loan facility availed from M/s. Dhavanam Finance under Loan Account No. <strong>{loanId}</strong>.
        I understand that the cheques shall be presented only in the event of my failure to repay as per the agreed terms.
        I confirm that sufficient funds shall be maintained in the respective bank accounts on the respective cheque dates.
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '12px' }}>
        <SignatureBlock label={`Signature of ${role}`} name={profile?.name} />
        <SignatureBlock label="Authorized Signatory" name="Dhavanam Finance" />
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#94a3b8' }}>
        <span>Page {pageNum} of 8</span>
        <span>Dhavanam Finance — Confidential Legal Document</span>
      </div>
    </div>
  );

  /* ======================================================================
     INLINE STYLES (for print fidelity — no Tailwind in @media print)
     ====================================================================== */
  const pageStyle: React.CSSProperties = {
    width: '210mm', minHeight: '297mm', maxHeight: '297mm', padding: '14mm 16mm',
    backgroundColor: 'white', boxSizing: 'border-box', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    fontSize: '9px', color: '#0f172a', lineHeight: 1.4, overflow: 'hidden',
    pageBreakAfter: 'always', display: 'flex', flexDirection: 'column',
    position: 'relative',
  };

  const thStyle: React.CSSProperties = {
    padding: '4px 5px', border: '1px solid #94a3b8', textAlign: 'left', fontWeight: 700,
  };

  const tdStyle: React.CSSProperties = {
    padding: '4px 5px', border: '1px solid #cbd5e1', textAlign: 'left', minHeight: '18px',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' as const,
    letterSpacing: '0.8px', color: '#0f172a', borderBottom: '1.5px solid #334155',
    paddingBottom: '3px', marginBottom: '6px',
  };

  /* ======================================================================
     RENDER
     ====================================================================== */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[97vh] flex flex-col">

        {/* ── Modal Action Bar (hidden on print) ── */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm tracking-wide">
              Dhavanam Finance — 8-Page Legal Loan Application Document
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Generate / Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Application</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Print Content ── */}
        <div ref={printRef} className="flex-1 overflow-y-auto bg-slate-200 print:bg-white print:overflow-visible" style={{ padding: '16px' }}>

          {/* ==================================================================
              PAGE 1: LOAN APPLICATION FORM
              ================================================================== */}
          <div className="legal-page" style={{ ...pageStyle, marginBottom: '16px' }}>
            <Letterhead subtitle="Loan Application" />

            {/* Title + Photo Boxes Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, borderBottom: '2.5px solid #047857', paddingBottom: '2px', display: 'inline-block' }}>
                  LOAN APPLICATION FORM
                </h2>
                <p style={{ fontSize: '7.5px', color: '#64748b', fontStyle: 'italic', margin: '3px 0 0 0' }}>
                  (To be submitted with passport photographs and physical signatures of all parties)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <PhotoBox label="Borrower" profile={borrower} />
                <PhotoBox label="Co-Borrower" profile={coBorrower} />
                <PhotoBox label="Guarantor" profile={primaryGuarantor} />
              </div>
            </div>

            {/* Section 1: Personal Particulars Table */}
            <div style={{ marginBottom: '8px' }}>
              <h3 style={sectionTitle}>1. Personal Particulars of Borrower / Co-Borrower / Guarantor</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700, fontSize: '7.5px', textTransform: 'uppercase' }}>
                    <th style={{ ...thStyle, width: '26%' }}>Particulars</th>
                    <th style={{ ...thStyle, width: '24.67%' }}>Borrower</th>
                    <th style={{ ...thStyle, width: '24.67%' }}>Co-Borrower</th>
                    <th style={{ ...thStyle, width: '24.67%' }}>Guarantor</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Name', borrower?.name, coBorrower?.name, primaryGuarantor?.name],
                    ["Father's / Husband's Name", borrower?.fatherName || borrower?.husbandName, coBorrower?.fatherName || coBorrower?.husbandName, primaryGuarantor?.fatherName || primaryGuarantor?.husbandName],
                    ['Age / Date of Birth', borrower?.age ? `${borrower.age} Yrs / ${formatDateDMY(borrower.dob)}` : formatDateDMY(borrower?.dob), coBorrower?.age ? `${coBorrower.age} Yrs / ${formatDateDMY(coBorrower.dob)}` : formatDateDMY(coBorrower?.dob), primaryGuarantor?.age ? `${primaryGuarantor.age} Yrs / ${formatDateDMY(primaryGuarantor.dob)}` : formatDateDMY(primaryGuarantor?.dob)],
                    ['Occupation / Business', borrower?.occupation, coBorrower?.occupation, primaryGuarantor?.occupation],
                    ['Office / Business Address', borrower?.officeAddress, coBorrower?.officeAddress, primaryGuarantor?.officeAddress],
                    ['Residential Address', borrower?.address || borrower?.residentialAddress, coBorrower?.address || coBorrower?.residentialAddress, primaryGuarantor?.address || primaryGuarantor?.residentialAddress],
                    ['Permanent Address', borrower?.permanentAddress || borrower?.address, coBorrower?.permanentAddress || coBorrower?.address, primaryGuarantor?.permanentAddress || primaryGuarantor?.address],
                    ['Phone Number', borrower?.phone, coBorrower?.phone, primaryGuarantor?.phone],
                    ['Mobile Number', borrower?.mobile, coBorrower?.mobile, primaryGuarantor?.mobile],
                    ['E-mail ID', borrower?.email, coBorrower?.email, primaryGuarantor?.email],
                    ['Annual Income (₹)', borrower?.annualIncome ? formatCurrency(borrower.annualIncome) : '', coBorrower?.annualIncome ? formatCurrency(coBorrower.annualIncome) : '', primaryGuarantor?.annualIncome ? formatCurrency(primaryGuarantor.annualIncome) : ''],
                  ].map(([label, bVal, cbVal, gVal], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, backgroundColor: '#f8fafc', fontSize: '8px' }}>{label}</td>
                      <td style={{ ...tdStyle, fontWeight: label === 'Name' ? 600 : 400 }}>{formatValue(bVal)}</td>
                      <td style={tdStyle}>{formatValue(cbVal)}</td>
                      <td style={tdStyle}>{formatValue(gVal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 2: Facilities Applied For */}
            <div style={{ marginBottom: '6px' }}>
              <h3 style={sectionTitle}>2. Facilities Applied For</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px' }}>
                <tbody>
                  {[
                    ['Nature of Facilities', loan.natureOfFacilities || 'Term Loan / Secured Credit'],
                    ['Amount Applied For (₹)', loan.principalAmount ? `${formatCurrency(loan.principalAmount)}${loan.deductedAmount ? ` (Deducted: ${formatCurrency(loan.deductedAmount)})` : ''}` : ''],
                    ['Purpose of Loan', loan.purposeOfLoan || ''],
                    ['Terms of Repayment', loan.repaymentTerms || ''],
                    ['Sources of Repayment', loan.sourcesOfRepayment || ''],
                    ['Securities / Collateral', loan.collateralDetails || ''],
                  ].map(([label, value], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, backgroundColor: '#f8fafc', width: '30%', fontSize: '8px' }}>{label}</td>
                      <td style={{ ...tdStyle, fontWeight: label === 'Amount Applied For (₹)' ? 700 : 400 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Declaration */}
            <div style={{ fontSize: '7.5px', color: '#334155', lineHeight: 1.45, marginBottom: '6px', textAlign: 'justify', border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#fffbeb' }}>
              <strong>Declaration:</strong> I/We hereby declare that all the information furnished in this application is true, correct, and complete to the best
              of my/our knowledge and belief. I/We understand that any false information may result in rejection of this application or recall of loan.
              I/We agree to abide by all the rules, terms, and conditions of M/s. Dhavanam Finance.
            </div>

            {/* Place, Date & Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginBottom: '6px' }}>
              <span>Place: <strong>{applicationPlace}</strong></span>
              <span>Date: <strong>{formatDate(applicationDate)}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <SignatureBlock label="Borrower" name={borrower?.name} />
              <SignatureBlock label="Co-Borrower" name={coBorrower?.name} />
              <SignatureBlock label="Guarantor" name={primaryGuarantor?.name} />
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #cbd5e1', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#94a3b8' }}>
              <span>Page 1 of 8</span>
              <span>Dhavanam Finance — Confidential Legal Document</span>
            </div>
          </div>

          {/* ==================================================================
              PAGE 2: CONSIDERATION RECEIPT
              ================================================================== */}
          <div className="legal-page" style={{ ...pageStyle, marginBottom: '16px' }}>
            <Letterhead subtitle="Consideration Receipt" />

            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px 0', borderBottom: '2.5px solid #047857', display: 'inline-block', paddingBottom: '3px' }}>
                CONSIDERATION RECEIPT
              </h2>
              <p style={{ fontSize: '8px', color: '#475569', margin: '4px 0 0 0' }}>
                (Receipt of Consideration Amount against Loan Facility)
              </p>
            </div>

            <div style={{ fontSize: '9.5px', lineHeight: 1.7, color: '#1e293b', textAlign: 'justify', marginBottom: '16px' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>Received with thanks</strong> from <strong>M/s. Dhavanam Finance</strong>, having its registered office at
                No. 42, Commercial Street, Shivajinagar, Bangalore - 560001, the sum of:
              </p>

              <div style={{ border: '2px solid #0f172a', padding: '10px 14px', marginBottom: '14px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#047857', letterSpacing: '1px' }}>
                  {formatCurrency(principalAmount)}
                </div>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#334155', marginTop: '4px', fontStyle: 'italic' }}>
                  ({amountInWords})
                </div>
              </div>

              <p style={{ marginBottom: '12px' }}>
                towards the loan facility sanctioned under Loan Account No. <strong>{loanId}</strong>,
                dated <strong>{formatDate(applicationDate)}</strong>, at <strong>{applicationPlace}</strong>.
              </p>

              <p style={{ marginBottom: '12px' }}>
                The said amount has been received by way of <strong>{loan.collateralDetails ? 'secured lending against pledged collateral' : 'clean credit facility'}</strong>.
              </p>

              <div style={{ border: '1px solid #cbd5e1', padding: '10px', marginBottom: '12px', backgroundColor: '#f1f5f9', fontSize: '9px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                  <div><strong>Borrower Name:</strong> {formatValue(borrower?.name)}</div>
                  <div><strong>Co-Borrower Name:</strong> {formatValue(coBorrower?.name)}</div>
                  <div><strong>Father's / Husband's Name:</strong> {formatValue(borrower?.fatherName || borrower?.husbandName)}</div>
                  <div><strong>Guarantor Name:</strong> {formatValue(primaryGuarantor?.name)}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Residential Address:</strong> {formatValue(borrower?.address || borrower?.residentialAddress)}</div>
                  <div><strong>Nature of Facility:</strong> {formatValue(loan.natureOfFacilities)}</div>
                  <div><strong>Purpose:</strong> {formatValue(loan.purposeOfLoan)}</div>
                </div>
              </div>

              <p style={{ marginBottom: '8px' }}>
                I/We acknowledge receipt of the above-mentioned sum and confirm that the same has been counted and verified in my/our
                presence. I/We agree to repay the said sum along with interest as per the terms and conditions of the said loan agreement.
              </p>

              <p style={{ marginBottom: '8px' }}>
                I/We further declare that I/We shall not deny or dispute the receipt of the said consideration at any point of time hereafter
                and this receipt shall be valid proof of payment by M/s. Dhavanam Finance.
              </p>

              <p>
                <strong>IN WITNESS WHEREOF,</strong> I/We have executed this receipt on
                this <strong>{formatDate(applicationDate)}</strong> at <strong>{applicationPlace}</strong>.
              </p>
            </div>

            {/* Witnesses */}
            <div style={{ marginBottom: '16px', fontSize: '8.5px' }}>
              <strong style={{ fontSize: '9px' }}>WITNESSES:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div style={{ border: '1px solid #cbd5e1', padding: '8px', minHeight: '50px' }}>
                  <div style={{ fontSize: '7.5px', color: '#64748b' }}>1. Name: ___________________________</div>
                  <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '4px' }}>Address: ___________________________</div>
                  <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '4px' }}>Signature: ___________________________</div>
                </div>
                <div style={{ border: '1px solid #cbd5e1', padding: '8px', minHeight: '50px' }}>
                  <div style={{ fontSize: '7.5px', color: '#64748b' }}>2. Name: ___________________________</div>
                  <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '4px' }}>Address: ___________________________</div>
                  <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '4px' }}>Signature: ___________________________</div>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <SignatureBlock label="Borrower" name={borrower?.name} />
              <SignatureBlock label="Co-Borrower" name={coBorrower?.name} />
              <SignatureBlock label="Guarantor" name={primaryGuarantor?.name} />
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#94a3b8' }}>
              <span>Page 2 of 8</span>
              <span>Dhavanam Finance — Confidential Legal Document</span>
            </div>
          </div>

          {/* ==================================================================
              PAGE 3: ON DEMAND PROMISSORY NOTE
              ================================================================== */}
          <div className="legal-page" style={{ ...pageStyle, marginBottom: '16px' }}>
            <Letterhead subtitle="Promissory Note" />

            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px 0', borderBottom: '2.5px solid #047857', display: 'inline-block', paddingBottom: '3px' }}>
                ON DEMAND PROMISSORY NOTE
              </h2>
              <p style={{ fontSize: '8px', color: '#475569', margin: '4px 0 0 0' }}>
                (Under the Negotiable Instruments Act, 1881)
              </p>
            </div>

            {/* Revenue Stamp Box */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <div style={{
                width: '70px', height: '70px', border: '2px dashed #94a3b8', display: 'flex',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                fontSize: '7px', color: '#64748b', fontWeight: 600, backgroundColor: '#fefce8',
              }}>
                Revenue<br/>Stamp<br/>(₹1)
              </div>
            </div>

            <div style={{ fontSize: '9.5px', lineHeight: 1.8, color: '#1e293b', textAlign: 'justify' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '9px' }}>
                <span>Place: <strong>{applicationPlace}</strong></span>
                <span>Date: <strong>{formatDate(applicationDate)}</strong></span>
                <span>Amount: <strong>{formatCurrency(principalAmount)}</strong></span>
              </div>

              <p style={{ marginBottom: '14px' }}>
                <strong>ON DEMAND,</strong> I/We, <strong>{formatValue(borrower?.name)}</strong>
                {coBorrower ? ` and ${formatValue(coBorrower.name)}` : ''},
                S/o, D/o, W/o <strong>{formatValue(borrower?.fatherName || borrower?.husbandName)}</strong>,
                residing at <strong>{formatValue(borrower?.address || borrower?.residentialAddress)}</strong>,
                hereby jointly and severally promise to pay to <strong>M/s. Dhavanam Finance</strong> or order,
                the sum of:
              </p>

              <div style={{ border: '2px solid #0f172a', padding: '10px 14px', marginBottom: '14px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#047857' }}>
                  {formatCurrency(principalAmount)}
                </div>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
                  ({amountInWords})
                </div>
              </div>

              <p style={{ marginBottom: '12px' }}>
                together with interest thereon at the rate of <strong>{loan.officialInterestRate || 12}% per annum</strong> from
                the date hereof until the date of payment, for value received. The interest shall be payable
                on <strong>{loan.collectionFrequency || 'monthly'}</strong> basis.
              </p>

              <p style={{ marginBottom: '12px' }}>
                In the event of default in payment, I/We agree to pay additional interest / penalty as per the terms
                of the loan agreement executed between the parties.
              </p>

              <p style={{ marginBottom: '12px' }}>
                This promissory note is given as security for the loan facility availed under
                Loan Account No. <strong>{loanId}</strong>.
              </p>

              <p style={{ marginBottom: '12px' }}>
                I/We further agree that the holder of this Note shall be entitled to recover the amount mentioned herein along with
                all costs, charges, and expenses in relation to the enforcement of this Note, including advocate fees.
              </p>

              <p>
                <strong>NOTICE:</strong> Presentment for payment and noting and protest for dishonour of this Note
                are hereby waived.
              </p>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <SignatureBlock label="Maker (Borrower)" name={borrower?.name} />
              {coBorrower && <SignatureBlock label="Co-Maker (Co-Borrower)" name={coBorrower.name} />}
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#94a3b8' }}>
              <span>Page 3 of 8</span>
              <span>Dhavanam Finance — Confidential Legal Document</span>
            </div>
          </div>

          {/* ==================================================================
              PAGE 4: REPAYMENT LETTER / UNDERTAKING
              ================================================================== */}
          <div className="legal-page" style={{ ...pageStyle, marginBottom: '16px' }}>
            <Letterhead subtitle="Repayment Letter" />

            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px 0', borderBottom: '2.5px solid #047857', display: 'inline-block', paddingBottom: '3px' }}>
                REPAYMENT LETTER / UNDERTAKING
              </h2>
              <p style={{ fontSize: '8px', color: '#475569', margin: '4px 0 0 0' }}>
                (Letter of Undertaking for Repayment of Loan)
              </p>
            </div>

            <div style={{ fontSize: '9.5px', lineHeight: 1.75, color: '#1e293b', textAlign: 'justify' }}>
              <p style={{ marginBottom: '8px' }}>To,</p>
              <p style={{ marginBottom: '2px', fontWeight: 700 }}>The Manager,</p>
              <p style={{ marginBottom: '2px', fontWeight: 700 }}>M/s. Dhavanam Finance,</p>
              <p style={{ marginBottom: '14px' }}>No. 42, Commercial Street, Shivajinagar, Bangalore - 560001.</p>

              <p style={{ marginBottom: '8px' }}>Dear Sir/Madam,</p>

              <p style={{ marginBottom: '10px' }}>
                <strong>Sub:</strong> Repayment Undertaking — Loan A/C No. <strong>{loanId}</strong> —
                Amount: <strong>{formatCurrency(principalAmount)}</strong>
              </p>

              <p style={{ marginBottom: '12px' }}>
                I/We, <strong>{formatValue(borrower?.name)}</strong>
                {coBorrower ? ` and ${formatValue(coBorrower.name)}` : ''},
                having availed a loan facility of <strong>{formatCurrency(principalAmount)}</strong> ({amountInWords})
                from M/s. Dhavanam Finance, hereby undertake and agree to the following terms of repayment:
              </p>

              <div style={{ paddingLeft: '14px', marginBottom: '12px' }}>
                <p style={{ marginBottom: '8px' }}>
                  <strong>1.</strong> The loan shall be repaid in accordance with the terms mentioned in the Loan Application
                  dated <strong>{formatDate(applicationDate)}</strong>.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>2.</strong> Interest shall be paid at the rate of <strong>{loan.officialInterestRate || 12}% per annum</strong> on
                  the outstanding principal balance on a <strong>{loan.collectionFrequency || 'monthly'}</strong> basis.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>3.</strong> Terms of Repayment: <strong>{formatValue(loan.repaymentTerms)}</strong>
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>4.</strong> Sources of Repayment: <strong>{formatValue(loan.sourcesOfRepayment)}</strong>
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>5.</strong> Securities Pledged: <strong>{formatValue(loan.collateralDetails)}</strong>
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>6.</strong> In case of default in payment of any installment/interest on the due date, I/We agree to pay
                  penal interest / additional charges as determined by M/s. Dhavanam Finance.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>7.</strong> I/We shall not change my/our residential or business address without prior written intimation
                  to M/s. Dhavanam Finance.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>8.</strong> M/s. Dhavanam Finance shall have the right to recall the entire outstanding amount at any time
                  without assigning any reason.
                </p>
              </div>

              <p style={{ marginBottom: '12px' }}>
                I/We have read and understood all the above terms and conditions and agree to abide by the same.
              </p>

              <p>
                Thanking you,
              </p>
            </div>

            {/* Place, Date & Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginTop: '14px', marginBottom: '8px' }}>
              <span>Place: <strong>{applicationPlace}</strong></span>
              <span>Date: <strong>{formatDate(applicationDate)}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <SignatureBlock label="Borrower" name={borrower?.name} />
              <SignatureBlock label="Co-Borrower" name={coBorrower?.name} />
              <SignatureBlock label="Guarantor" name={primaryGuarantor?.name} />
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#94a3b8' }}>
              <span>Page 4 of 8</span>
              <span>Dhavanam Finance — Confidential Legal Document</span>
            </div>
          </div>

          {/* ==================================================================
              PAGE 5: FORM NO. 6 (GUARANTEE FORM)
              ================================================================== */}
          <div className="legal-page" style={{ ...pageStyle, marginBottom: '16px' }}>
            <Letterhead subtitle="Form No. 6" />

            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 2px 0' }}>
                FORM NO. 6
              </h2>
              <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#334155', margin: '0 0 4px 0', borderBottom: '2.5px solid #047857', display: 'inline-block', paddingBottom: '3px' }}>
                GUARANTEE DEED / SURETY FORM
              </h3>
              <p style={{ fontSize: '8px', color: '#475569', margin: '4px 0 0 0' }}>
                (Form of Personal Guarantee under the loan facility)
              </p>
            </div>

            <div style={{ fontSize: '9.5px', lineHeight: 1.75, color: '#1e293b', textAlign: 'justify' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>To,</strong><br />
                <strong>M/s. Dhavanam Finance,</strong><br />
                No. 42, Commercial Street, Shivajinagar, Bangalore - 560001.
              </p>

              <p style={{ marginBottom: '12px' }}>
                In consideration of M/s. Dhavanam Finance (hereinafter called "the Lender") having agreed to grant/granting/continuing
                the loan/credit facility to:
              </p>

              <div style={{ border: '1px solid #cbd5e1', padding: '10px', marginBottom: '12px', backgroundColor: '#f1f5f9', fontSize: '9px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  <div><strong>Borrower:</strong> {formatValue(borrower?.name)}</div>
                  <div><strong>Co-Borrower:</strong> {formatValue(coBorrower?.name)}</div>
                  <div><strong>Loan A/C No.:</strong> {loanId}</div>
                  <div><strong>Amount:</strong> {formatCurrency(principalAmount)}</div>
                  <div><strong>Date:</strong> {formatDate(applicationDate)}</div>
                  <div><strong>Purpose:</strong> {formatValue(loan.purposeOfLoan)}</div>
                </div>
              </div>

              <p style={{ marginBottom: '10px' }}>
                I, <strong>{formatValue(primaryGuarantor?.name)}</strong>,
                S/o, D/o, W/o <strong>{formatValue(primaryGuarantor?.fatherName || primaryGuarantor?.husbandName)}</strong>,
                aged <strong>{primaryGuarantor?.age ? `${primaryGuarantor.age} years` : '______'}</strong>,
                residing at <strong>{formatValue(primaryGuarantor?.address || primaryGuarantor?.residentialAddress)}</strong>,
                hereby irrevocably and unconditionally guarantee:
              </p>

              <div style={{ paddingLeft: '14px', marginBottom: '12px' }}>
                <p style={{ marginBottom: '8px' }}>
                  <strong>1.</strong> The due repayment of all sums of money now due or which may at any time hereafter become
                  due to the Lender from the Borrower under the above-mentioned loan facility.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>2.</strong> This guarantee shall be a continuing guarantee and shall remain in force until the entire
                  dues including principal, interest, costs, charges, expenses, and all other amounts are fully paid and satisfied.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>3.</strong> My liability under this guarantee shall not be affected by any variation in the terms of the loan,
                  any time or indulgence given by the Lender, or any other circumstance.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>4.</strong> The Lender may proceed against me without first proceeding against the Borrower.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>5.</strong> I hereby waive all rights of suretyship and agree that my obligations shall be co-extensive
                  with that of the Borrower.
                </p>
              </div>

              <p style={{ marginBottom: '10px' }}>
                <strong>IN WITNESS WHEREOF,</strong> I have executed this Guarantee Deed on this
                day of <strong>{formatDate(applicationDate)}</strong> at <strong>{applicationPlace}</strong>.
              </p>
            </div>

            {/* Guarantor Info Box */}
            <div style={{ border: '1px solid #94a3b8', padding: '8px', marginBottom: '10px', fontSize: '8.5px', backgroundColor: '#f8fafc' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '9px' }}>Guarantor Details:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
                <div><strong>Name:</strong> {formatValue(primaryGuarantor?.name)}</div>
                <div><strong>Age:</strong> {primaryGuarantor?.age ? `${primaryGuarantor.age} Yrs` : ''}</div>
                <div><strong>Occupation:</strong> {formatValue(primaryGuarantor?.occupation)}</div>
                <div><strong>Mobile:</strong> {formatValue(primaryGuarantor?.mobile)}</div>
                <div><strong>Annual Income:</strong> {primaryGuarantor?.annualIncome ? formatCurrency(primaryGuarantor.annualIncome) : ''}</div>
                <div><strong>Email:</strong> {formatValue(primaryGuarantor?.email)}</div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <SignatureBlock label="Guarantor / Surety" name={primaryGuarantor?.name} />
              <SignatureBlock label="Borrower (Accepted)" name={borrower?.name} />
              <SignatureBlock label="Authorized Signatory" name="Dhavanam Finance" />
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#94a3b8' }}>
              <span>Page 5 of 8</span>
              <span>Dhavanam Finance — Confidential Legal Document</span>
            </div>
          </div>

          {/* ==================================================================
              PAGES 6-8: PDC / CHEQUE REGISTRATION (Borrower, Co-Borrower, Guarantor)
              ================================================================== */}
          <div style={{ marginBottom: '16px' }}>
            <PDCRegistrationPage role="Borrower" profile={borrower} pageNum={6} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <PDCRegistrationPage role="Co-Borrower" profile={coBorrower} pageNum={7} />
          </div>
          <div>
            <PDCRegistrationPage role="Guarantor" profile={primaryGuarantor} pageNum={8} />
          </div>

        </div>
      </div>

      {/* ── Print-specific CSS ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .legal-page, .legal-page * { visibility: visible !important; }
          .print\\:hidden { display: none !important; }

          .legal-page {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            height: 297mm !important;
            padding: 12mm 14mm !important;
            margin: 0 !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: none !important;
            position: relative !important;
            overflow: hidden !important;
          }

          .legal-page:last-child {
            page-break-after: auto !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
