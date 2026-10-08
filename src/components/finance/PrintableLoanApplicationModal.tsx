import React from 'react';
import { Loan, Profile } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer, X, ShieldCheck, Download } from 'lucide-react';

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
  if (!isOpen) return null;

  const borrower = loan.borrowerSnapshot || propBorrower;
  const coBorrower = loan.coBorrowerSnapshot || propCoBorrower;
  const guarantor1 = loan.guarantor1Snapshot || propGuarantor1;
  const guarantor2 = loan.guarantor2Snapshot || propGuarantor2;
  const primaryGuarantor = guarantor1 || guarantor2;

  const handlePrint = () => {
    window.print();
  };

  const formatValue = (val?: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Action Bar (Hidden during window.print()) */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm tracking-wide font-sans">
              Printable Dhavanam Finance Loan Application (A4 Portrait)
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Application</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          {/* Printable Page Card */}
          <div
            id="printable-loan-application"
            className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white border border-slate-300 print:border-none p-6 sm:p-8 space-y-4 text-slate-900 font-sans shadow-md print:shadow-none text-xs leading-tight"
          >
            {/* Letterhead Header */}
            <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm tracking-wider">
                    DF
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase font-sans">
                      DHAVANAM FINANCE
                    </h1>
                    <p className="text-[10px] text-slate-600 font-medium tracking-wide font-mono">
                      PBMS ENTERPRISE FINANCIAL SERVICES • BANGALORE
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-sans">
                  No. 42, Commercial Street, Shivajinagar, Bangalore - 560001 • Tel: 080-25591000
                </p>
              </div>

              <div className="text-right font-mono text-xs space-y-1">
                <div className="bg-slate-100 px-3 py-1 rounded border border-slate-300 inline-block font-bold text-slate-900">
                  A/C NO: {loan.id || 'LN-2026-NEW'}
                </div>
                <div className="text-[11px] text-slate-600">
                  Date: <span className="font-semibold text-slate-900">{formatDate(applicationDate)}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Place: <span className="font-semibold text-slate-900">{applicationPlace}</span>
                </div>
              </div>
            </div>

            {/* Document Title & Photo Attachment Boxes */}
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-emerald-600 inline-block pb-0.5 font-sans">
                  LOAN APPLICATION FORM
                </h2>
                <p className="text-[10px] text-slate-500 italic">
                  (To be submitted with passport photographs and physical signatures)
                </p>
              </div>

              {/* 3 Physical Photo Boxes */}
              <div className="flex space-x-3">
                <div className="w-20 h-24 border-2 border-dashed border-slate-400 bg-slate-50/50 rounded flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                  {borrower?.photoUrl ? (
                    <img src={borrower.photoUrl} alt="Borrower" className="w-full h-full object-cover rounded-xs" />
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">BORROWER</span>
                      <span className="text-[8px] text-slate-400 mt-1">[ Photo ]</span>
                    </>
                  )}
                </div>
                <div className="w-20 h-24 border-2 border-dashed border-slate-400 bg-slate-50/50 rounded flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                  {coBorrower?.photoUrl ? (
                    <img src={coBorrower.photoUrl} alt="Co-Borrower" className="w-full h-full object-cover rounded-xs" />
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">CO-BORROWER</span>
                      <span className="text-[8px] text-slate-400 mt-1">[ Photo ]</span>
                    </>
                  )}
                </div>
                <div className="w-20 h-24 border-2 border-dashed border-slate-400 bg-slate-50/50 rounded flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                  {primaryGuarantor?.photoUrl ? (
                    <img src={primaryGuarantor.photoUrl} alt="Guarantor" className="w-full h-full object-cover rounded-xs" />
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">GUARANTOR</span>
                      <span className="text-[8px] text-slate-400 mt-1">[ Photo ]</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Particulars 3-Column Table */}
            <div className="space-y-1.5 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans border-b border-slate-300 pb-1">
                1. PERSONAL PARTICULAR DETAILS
              </h3>
              <table className="w-full border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold uppercase border-b border-slate-400 text-[10px]">
                    <th className="p-2 border-r border-slate-400 text-left w-1/4">FIELD / PARTICULAR</th>
                    <th className="p-2 border-r border-slate-400 text-left w-1/4">BORROWER</th>
                    <th className="p-2 border-r border-slate-400 text-left w-1/4">CO-BORROWER</th>
                    <th className="p-2 text-left w-1/4">GUARANTOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-slate-800">
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Full Name</td>
                    <td className="p-1.5 font-semibold border-r border-slate-400">{formatValue(borrower?.name)}</td>
                    <td className="p-1.5 border-r border-slate-400">{formatValue(coBorrower?.name)}</td>
                    <td className="p-1.5">{formatValue(primaryGuarantor?.name)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Father's / Husband's Name</td>
                    <td className="p-1.5 border-r border-slate-400">{formatValue(borrower?.fatherName || borrower?.husbandName)}</td>
                    <td className="p-1.5 border-r border-slate-400">{formatValue(coBorrower?.fatherName || coBorrower?.husbandName)}</td>
                    <td className="p-1.5">{formatValue(primaryGuarantor?.fatherName || primaryGuarantor?.husbandName)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Age / Date of Birth</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono">{borrower?.age ? `${borrower.age} Yrs` : formatValue(borrower?.dob)}</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono">{coBorrower?.age ? `${coBorrower.age} Yrs` : formatValue(coBorrower?.dob)}</td>
                    <td className="p-1.5 font-mono">{primaryGuarantor?.age ? `${primaryGuarantor.age} Yrs` : formatValue(primaryGuarantor?.dob)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Occupation / Business</td>
                    <td className="p-1.5 border-r border-slate-400">{formatValue(borrower?.occupation)}</td>
                    <td className="p-1.5 border-r border-slate-400">{formatValue(coBorrower?.occupation)}</td>
                    <td className="p-1.5">{formatValue(primaryGuarantor?.occupation)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Residential Address</td>
                    <td className="p-1.5 border-r border-slate-400 leading-snug">{formatValue(borrower?.address || borrower?.residentialAddress)}</td>
                    <td className="p-1.5 border-r border-slate-400 leading-snug">{formatValue(coBorrower?.address || coBorrower?.residentialAddress)}</td>
                    <td className="p-1.5 leading-snug">{formatValue(primaryGuarantor?.address || primaryGuarantor?.residentialAddress)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Permanent Address</td>
                    <td className="p-1.5 border-r border-slate-400 leading-snug">{formatValue(borrower?.permanentAddress || borrower?.address)}</td>
                    <td className="p-1.5 border-r border-slate-400 leading-snug">{formatValue(coBorrower?.permanentAddress || coBorrower?.address)}</td>
                    <td className="p-1.5 leading-snug">{formatValue(primaryGuarantor?.permanentAddress || primaryGuarantor?.address)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Office / Business Address</td>
                    <td className="p-1.5 border-r border-slate-400 leading-snug">{formatValue(borrower?.officeAddress)}</td>
                    <td className="p-1.5 border-r border-slate-400 leading-snug">{formatValue(coBorrower?.officeAddress)}</td>
                    <td className="p-1.5 leading-snug">{formatValue(primaryGuarantor?.officeAddress)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Mobile / Phone</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono">{formatValue(borrower?.mobile || borrower?.phone)}</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono">{formatValue(coBorrower?.mobile || coBorrower?.phone)}</td>
                    <td className="p-1.5 font-mono">{formatValue(primaryGuarantor?.mobile || primaryGuarantor?.phone)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">E-mail ID</td>
                    <td className="p-1.5 border-r border-slate-400">{formatValue(borrower?.email)}</td>
                    <td className="p-1.5 border-r border-slate-400">{formatValue(coBorrower?.email)}</td>
                    <td className="p-1.5">{formatValue(primaryGuarantor?.email)}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Annual Income (₹)</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono font-semibold">{borrower?.annualIncome ? formatCurrency(borrower.annualIncome) : ''}</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono font-semibold">{coBorrower?.annualIncome ? formatCurrency(coBorrower.annualIncome) : ''}</td>
                    <td className="p-1.5 font-mono font-semibold">{primaryGuarantor?.annualIncome ? formatCurrency(primaryGuarantor.annualIncome) : ''}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r border-slate-400 bg-slate-50">Aadhaar & PAN No.</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono text-[10px]">
                      {borrower ? `${borrower.aadhaar} / ${borrower.pan}` : ''}
                    </td>
                    <td className="p-1.5 border-r border-slate-400 font-mono text-[10px]">
                      {coBorrower ? `${coBorrower.aadhaar} / ${coBorrower.pan}` : ''}
                    </td>
                    <td className="p-1.5 font-mono text-[10px]">
                      {primaryGuarantor ? `${primaryGuarantor.aadhaar} / ${primaryGuarantor.pan}` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Facility & Credit Particulars Section */}
            <div className="space-y-1.5 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans border-b border-slate-300 pb-1">
                2. LOAN FACILITY & COLLATERAL
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border border-slate-400 p-2.5 rounded bg-slate-50/50 text-[11px]">
                <div>
                  <span className="font-bold text-slate-700 block">Nature of Facilities:</span>
                  <span className="font-semibold text-slate-900 block">{loan.natureOfFacilities || 'Term Loan / Secured Credit'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Amount Applied For (₹):</span>
                  <span className="font-mono font-bold text-emerald-800 text-xs block">
                    {loan.principalAmount ? formatCurrency(loan.principalAmount) : ''}
                    {loan.deductedAmount ? (
                      <span className="text-[10px] text-slate-500 font-normal ml-2">
                        (Deducted: {formatCurrency(loan.deductedAmount)})
                      </span>
                    ) : null}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Purpose of Loan:</span>
                  <span className="text-slate-900 block">{loan.purposeOfLoan || 'Commercial Inventory & Business Expansion'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Terms of Repayment:</span>
                  <span className="text-slate-900 block">{loan.repaymentTerms || 'Monthly interest collection on pending principal'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Sources of Repayment:</span>
                  <span className="text-slate-900 block">{loan.sourcesOfRepayment || 'Business Cash Flows & Retail Trading Turnover'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Securities / Collateral Details:</span>
                  <span className="text-slate-900 block">{loan.collateralDetails || 'Signed Promissory Note + Title Deed Copy'}</span>
                </div>
              </div>
            </div>

            {/* Declaration Statement */}
            <div className="space-y-1 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                3. DECLARATION
              </h3>
              <p className="text-[10px] text-slate-700 text-justify leading-relaxed border border-slate-300 p-2 rounded bg-slate-50/30">
                I/We hereby declare that all the information furnished in this application is true, correct, and complete to the best of my/our knowledge and belief. I/We confirm that no insolvency or legal proceedings are pending against me/us. I/We agree to abide by all the rules, terms, and conditions of Dhavanam Finance.
              </p>
            </div>

            {/* Place, Date & Physical Signatures Footer */}
            <div className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <div>
                  Place: <span className="font-bold text-slate-900">{applicationPlace}</span>
                </div>
                <div>
                  Date: <span className="font-bold text-slate-900">{formatDate(applicationDate)}</span>
                </div>
              </div>

              {/* Physical Signature Boxes */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="border border-slate-400 rounded p-3 h-20 flex flex-col justify-between text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">[ Physical Signature ]</div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-[10px] text-slate-900">
                    Signature of Borrower
                  </div>
                </div>

                <div className="border border-slate-400 rounded p-3 h-20 flex flex-col justify-between text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">[ Physical Signature ]</div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-[10px] text-slate-900">
                    Signature of Co-Borrower
                  </div>
                </div>

                <div className="border border-slate-400 rounded p-3 h-20 flex flex-col justify-between text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">[ Physical Signature ]</div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-[10px] text-slate-900">
                    Signature of Guarantor
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
