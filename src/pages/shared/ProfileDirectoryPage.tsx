import React, { useState, useRef } from 'react';
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Users2,
  Calendar,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Pencil,
  ShieldCheck,
  User,
  Camera,
  Upload,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { Profile, ProfileType } from '../../types';

export const ProfileDirectoryPage: React.FC<{ initialProfileId?: string }> = ({ initialProfileId }) => {
  const {
    profiles,
    createProfile,
    updateProfile,
    loans,
    chitMembers,
    rentalAgreements,
    documents,
  } = useERP();

  // Selected Profile for 360 Detail Drawer
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(
    profiles.find(p => p.id === initialProfileId) || profiles[0] || null
  );

  // New Profile Modal State
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [occupation, setOccupation] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('borrower');
  const [officeAddress, setOfficeAddress] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [resSameAsOffice, setResSameAsOffice] = useState(false);
  const [permSameAsRes, setPermSameAsRes] = useState(false);
  const [permSameAsOffice, setPermSameAsOffice] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [referenceContact, setReferenceContact] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Profile Modal
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editAge, setEditAge] = useState<number | ''>('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editAnnualIncome, setEditAnnualIncome] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPrimaryPhone, setEditPrimaryPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editOfficeAddress, setEditOfficeAddress] = useState('');
  const [editResidentialAddress, setEditResidentialAddress] = useState('');
  const [editPermanentAddress, setEditPermanentAddress] = useState('');
  const [editAadhaar, setEditAadhaar] = useState('');
  const [editPan, setEditPan] = useState('');
  const [editReferenceName, setEditReferenceName] = useState('');
  const [editReferenceContact, setEditReferenceContact] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const editPhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredProfiles = profiles.filter(p => {
    if (filterType !== 'all' && p.profileType !== filterType) return false;
    if (
      searchTerm &&
      !(p.fullName || p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(p.primaryPhone || p.mobile || '').includes(searchTerm) &&
      !p.id.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Calculate age automatically from Date of Birth
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (!val) {
      setAge('');
      return;
    }
    const birthDate = new Date(val);
    if (isNaN(birthDate.getTime())) {
      setAge('');
      return;
    }
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    setAge(calculatedAge >= 0 ? calculatedAge : 0);
  };

  // Address copy handlers for new profile modal
  const handleResSameAsOffice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setResSameAsOffice(checked);
    if (checked) {
      setResidentialAddress(officeAddress);
    }
  };

  const handlePermSameAsRes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setPermSameAsRes(checked);
    if (checked) {
      setPermSameAsOffice(false);
      setPermanentAddress(residentialAddress);
    }
  };

  const handlePermSameAsOffice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setPermSameAsOffice(checked);
    if (checked) {
      setPermSameAsRes(false);
      setPermanentAddress(officeAddress);
    }
  };

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditDob(val);
    if (!val) {
      setEditAge('');
      return;
    }
    const birthDate = new Date(val);
    if (isNaN(birthDate.getTime())) {
      setEditAge('');
      return;
    }
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    setEditAge(calculatedAge >= 0 ? calculatedAge : 0);
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetNewProfileForm = () => {
    setFullName('');
    setNickname('');
    setFatherName('');
    setDob('');
    setAge('');
    setOccupation('');
    setAnnualIncome('');
    setPhone('');
    setPrimaryPhone('');
    setEmail('');
    setProfileType('borrower');
    setOfficeAddress('');
    setResidentialAddress('');
    setPermanentAddress('');
    setResSameAsOffice(false);
    setPermSameAsRes(false);
    setPermSameAsOffice(false);
    setAadhaarNumber('');
    setPanNumber('');
    setReferenceName('');
    setReferenceContact('');
    setPhotoUrl('');
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newP = createProfile({
      name: fullName,
      fullName,
      nickname: nickname || undefined,
      fatherName,
      husbandName: fatherName,
      dob: dob || undefined,
      age: typeof age === 'number' ? age : undefined,
      occupation,
      annualIncome: annualIncome ? Number(annualIncome) : undefined,
      phone: phone || undefined,
      mobile: primaryPhone,
      primaryPhone,
      email: email || undefined,
      profileType,
      officeAddress: officeAddress || undefined,
      address: residentialAddress,
      residentialAddress,
      permanentAddress: permanentAddress || undefined,
      aadhaar: aadhaarNumber || '',
      aadhaarNumber: aadhaarNumber || undefined,
      pan: panNumber || '',
      panNumber: panNumber || undefined,
      referenceName: referenceName || undefined,
      referenceContact: referenceContact || undefined,
      photoUrl: photoUrl || undefined,
      isKycVerified: true,
    });
    setIsNewProfileModalOpen(false);
    setSelectedProfile(newP);
    resetNewProfileForm();
  };

  const openEditModal = (p: Profile) => {
    setEditName(p.fullName || p.name);
    setEditNickname(p.nickname || '');
    setEditFatherName(p.fatherName || p.husbandName || '');
    setEditDob(p.dob || '');
    setEditAge(typeof p.age === 'number' ? p.age : '');
    setEditOccupation(p.occupation || '');
    setEditAnnualIncome(p.annualIncome ? String(p.annualIncome) : '');
    setEditPhone(p.phone || '');
    setEditPrimaryPhone(p.primaryPhone || p.mobile);
    setEditEmail(p.email || '');
    setEditOfficeAddress(p.officeAddress || '');
    setEditResidentialAddress(p.residentialAddress || p.address || '');
    setEditPermanentAddress(p.permanentAddress || '');
    setEditAadhaar(p.aadhaarNumber || p.aadhaar || '');
    setEditPan(p.panNumber || p.pan || '');
    setEditReferenceName(p.referenceName || '');
    setEditReferenceContact(p.referenceContact || '');
    setEditPhotoUrl(p.photoUrl || '');
    setIsEditProfileModalOpen(true);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    const updatedData: Partial<Profile> = {
      name: editName,
      fullName: editName,
      nickname: editNickname || undefined,
      fatherName: editFatherName,
      husbandName: editFatherName,
      dob: editDob || undefined,
      age: typeof editAge === 'number' ? editAge : undefined,
      occupation: editOccupation || undefined,
      annualIncome: editAnnualIncome ? Number(editAnnualIncome) : undefined,
      phone: editPhone || undefined,
      mobile: editPrimaryPhone,
      primaryPhone: editPrimaryPhone,
      email: editEmail || undefined,
      officeAddress: editOfficeAddress || undefined,
      address: editResidentialAddress,
      residentialAddress: editResidentialAddress,
      permanentAddress: editPermanentAddress || undefined,
      aadhaar: editAadhaar,
      aadhaarNumber: editAadhaar,
      pan: editPan,
      panNumber: editPan,
      referenceName: editReferenceName || undefined,
      referenceContact: editReferenceContact || undefined,
      photoUrl: editPhotoUrl || undefined,
    };
    updateProfile(selectedProfile.id, updatedData);
    setSelectedProfile({ ...selectedProfile, ...updatedData });
    setIsEditProfileModalOpen(false);
  };

  // Cross-module 360 relations for selected profile
  const profileLoans = selectedProfile
    ? loans.filter(l => l.borrowerProfileId === selectedProfile.id)
    : [];
  const profileChits = selectedProfile
    ? chitMembers.filter(m => m.profileId === selectedProfile.id)
    : [];
  const profileLeases = selectedProfile
    ? rentalAgreements.filter(a => a.tenantProfileId === selectedProfile.id)
    : [];
  const profileDocs = selectedProfile
    ? documents.filter(d => d.entityId === selectedProfile.id)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile Master (Single Identity)"
        subtitle="Centralized KYC & 360-degree customer profile linked across Borrowers, Subscribers, Tenants & Vendors."
        breadcrumbs={[
          { label: 'Dashboard', href: '#dashboard' },
          { label: 'Shared Platform Services' },
          { label: 'Profile Master' },
        ]}
        actions={
          <button
            onClick={() => setIsNewProfileModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Profile</span>
          </button>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Unified Profiles"
          value={profiles.length.toString()}
          subtitle="Single-identity master database"
          icon={UserCheck}
          variant="primary"
        />
        <StatCard
          title="Borrowers (Finance)"
          value={profiles.filter(p => p.profileType === 'borrower').length.toString()}
          subtitle="Active lending customers"
          icon={CreditCard}
          variant="default"
        />
        <StatCard
          title="Chit Subscribers"
          value={profiles.filter(p => p.profileType === 'subscriber').length.toString()}
          subtitle="Enrolled chit fund members"
          icon={Users2}
          variant="success"
        />
        <StatCard
          title="Tenants (Rental)"
          value={profiles.filter(p => p.profileType === 'tenant').length.toString()}
          subtitle="Real-estate unit occupants"
          icon={Building}
          variant="warning"
        />
      </div>

      {/* Main 2-Column Layout: Left Directory List, Right 360 Degree View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Directory List (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone or ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['all', 'borrower', 'subscriber', 'tenant', 'vendor'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                    filterType === t
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Profiles Scroll List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredProfiles.map(p => {
              const isSelected = selectedProfile?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfile(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600/30'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt=""
                          className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {(p.fullName || p.name || 'C').charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                          {p.id}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {p.fullName || p.name} {p.nickname ? `(${p.nickname})` : ''}
                        </h4>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {p.profileType}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="font-mono">{p.primaryPhone || p.mobile}</span>
                    </span>
                    {p.isKycVerified ? (
                      <span className="text-emerald-700 font-semibold flex items-center space-x-0.5 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>KYC Verified</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium text-[10px]">Pending KYC</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: 360 Degree Customer Detail (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {selectedProfile ? (
            <>
              {/* Header Info */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3.5">
                  {selectedProfile.photoUrl ? (
                    <img
                      src={selectedProfile.photoUrl}
                      alt={selectedProfile.fullName || selectedProfile.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                      {(selectedProfile.fullName || selectedProfile.name || 'Customer').charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedProfile.fullName || selectedProfile.name}
                        {selectedProfile.nickname ? ` (${selectedProfile.nickname})` : ''}
                      </h3>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded font-semibold text-slate-700">
                        {selectedProfile.id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{selectedProfile.primaryPhone || selectedProfile.mobile}</span>
                      </span>
                      {selectedProfile.email && (
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedProfile.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedProfile.profileType}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedProfile)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Identity, KYC & Reference Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Father's / Husband's Name</span>
                  <span className="text-slate-800 font-semibold">{selectedProfile.fatherName || selectedProfile.husbandName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Date of Birth & Age</span>
                  <span className="text-slate-800 font-semibold">
                    {selectedProfile.dob ? `${formatDate(selectedProfile.dob)}` : '—'}
                    {selectedProfile.age ? ` (${selectedProfile.age} Yrs)` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Occupation & Income</span>
                  <span className="text-slate-800 font-medium">
                    {selectedProfile.occupation || '—'} {selectedProfile.annualIncome ? `(₹${selectedProfile.annualIncome.toLocaleString('en-IN')}/Yr)` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Contact Numbers</span>
                  <span className="font-mono text-slate-800 font-medium">
                    Mob: {selectedProfile.primaryPhone || selectedProfile.mobile || '—'}
                    {selectedProfile.phone ? ` | Ph: ${selectedProfile.phone}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">KYC Identifiers</span>
                  <span className="font-mono font-medium text-slate-800">
                    Aadhaar: {selectedProfile.aadhaarNumber || selectedProfile.aadhaar || 'Not Recorded'}
                    <br />
                    PAN: {selectedProfile.panNumber || selectedProfile.pan || 'Not Recorded'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Reference Contact</span>
                  <span className="text-slate-800 font-medium">
                    {selectedProfile.referenceName ? `${selectedProfile.referenceName} (${selectedProfile.referenceContact || 'No Phone'})` : 'No Reference Listed'}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-2.5 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Residential Address</span>
                    <span className="text-slate-800 font-medium leading-relaxed">{selectedProfile.residentialAddress || selectedProfile.address || 'Address not recorded'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Office / Business Address</span>
                    <span className="text-slate-800 font-medium leading-relaxed">{selectedProfile.officeAddress || 'None recorded'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-mono">Permanent Address</span>
                    <span className="text-slate-800 font-medium leading-relaxed">{selectedProfile.permanentAddress || 'None recorded'}</span>
                  </div>
                </div>
              </div>

              {/* 360-Degree Cross-Module Ledger Connections */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 font-mono">
                  360° Reusable Identity Cross-Module Engagements
                </h4>

                {/* Loans Segment */}
                <div className="p-3.5 border border-slate-200 rounded-xl space-y-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Lending Contracts ({profileLoans.length})</span>
                    </span>
                  </div>

                  {profileLoans.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No loan accounts associated.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profileLoans.map(l => (
                        <div key={l.id} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg">
                          <div>
                            <span className="font-mono font-bold text-slate-900">{l.id}</span>
                            <span className="text-slate-500 text-[11px] ml-2 font-mono">Principal: {formatCurrency(l.principalAmount)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-emerald-700">Balance: {formatCurrency(l.pendingPrincipal)}</span>
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">{l.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chit Funds Segment */}
                <div className="p-3.5 border border-slate-200 rounded-xl space-y-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Users2 className="w-4 h-4 text-purple-600" />
                      <span>Chit Fund Groups ({profileChits.length})</span>
                    </span>
                  </div>

                  {profileChits.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No chit group memberships recorded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profileChits.map(m => (
                        <div key={m.id} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg font-mono">
                          <div>
                            <span className="font-bold text-slate-900">Group: {m.groupId}</span>
                            <span className="text-slate-500 ml-2 text-[11px]">Ticket #{m.ticketNumber || '01'}</span>
                          </div>
                          <span className="font-bold text-purple-800">Total Paid: {formatCurrency(m.totalPaid)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rental Leases Segment */}
                <div className="p-3.5 border border-slate-200 rounded-xl space-y-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>Rental Leases ({profileLeases.length})</span>
                    </span>
                  </div>

                  {profileLeases.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No real-estate leases associated.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {profileLeases.map(a => (
                        <div key={a.id} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg font-mono">
                          <div>
                            <span className="font-bold text-slate-900">{a.id}</span>
                            <span className="text-slate-500 ml-2 text-[11px]">Unit: {a.childPropertyId}</span>
                          </div>
                          <span className="font-bold text-blue-800">Rent: {formatCurrency(a.rentAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 italic text-xs">
              Select a customer profile from the left directory list to view details.
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW PROFILE MODAL */}
      <Modal
        isOpen={isNewProfileModalOpen}
        onClose={() => {
          setIsNewProfileModalOpen(false);
          resetNewProfileForm();
        }}
        title="Create Reusable Customer Profile"
        subtitle="Single-identity master record used across Finance, Chit Fund, Rental, and Vendor accounts."
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateProfile} className="space-y-5 text-xs">
          {/* 1. PERSONAL DETAILS */}
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Personal Details
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">* Required for legal loan documents</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="First & Last Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Father's / Husband's Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Parent / Spouse Name"
                  value={fatherName}
                  onChange={e => setFatherName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={handleDobChange}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Age</label>
                  <span className="text-[10px] text-emerald-600 font-semibold font-mono">Auto calculated</span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  placeholder="Auto calculated"
                  value={age !== '' ? `${age} Years` : ''}
                  className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Occupation / Business *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Textile Merchant / IT Consultant / Salaried"
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Income *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    placeholder="Annual Income in ₹"
                    value={annualIncome}
                    onChange={e => setAnnualIncome(e.target.value)}
                    className="w-full pl-7 pr-3 p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. CONTACT DETAILS */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Contact Details
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="Landline / Alt Phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Mobile *</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={primaryPhone}
                  onChange={e => setPrimaryPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Profile Classification</label>
                <select
                  value={profileType}
                  onChange={e => setProfileType(e.target.value as ProfileType)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="borrower">Borrower (Finance)</option>
                  <option value="subscriber">Chit Subscriber</option>
                  <option value="tenant">Rental Tenant</option>
                  <option value="vendor">Vendor / Supplier</option>
                  <option value="partner">Business Partner</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. ADDRESS DETAILS */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Address Details
              </h4>
            </div>

            {/* Office / Business Address */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office / Business Address</label>
              <textarea
                rows={2}
                placeholder="Door No., Street, Area, City, State, Pincode"
                value={officeAddress}
                onChange={e => setOfficeAddress(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Residential Address */}
            <div>
              <div className="flex flex-wrap items-center justify-between mb-1 gap-2">
                <label className="block font-semibold text-slate-700">Residential Address *</label>
                <label className="inline-flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resSameAsOffice}
                    onChange={handleResSameAsOffice}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 border-slate-300"
                  />
                  <span>Same as Office / Business Address</span>
                </label>
              </div>
              <textarea
                rows={2}
                required
                placeholder="Door No., Street, Area, City, Pincode"
                value={residentialAddress}
                onChange={e => {
                  setResidentialAddress(e.target.value);
                  if (resSameAsOffice && e.target.value !== officeAddress) {
                    setResSameAsOffice(false);
                  }
                }}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Permanent Address */}
            <div>
              <div className="flex flex-wrap items-center justify-between mb-1 gap-2">
                <label className="block font-semibold text-slate-700">Permanent Address</label>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={permSameAsRes}
                      onChange={handlePermSameAsRes}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 border-slate-300"
                    />
                    <span>Same as Residential Address</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={permSameAsOffice}
                      onChange={handlePermSameAsOffice}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 border-slate-300"
                    />
                    <span>Same as Office / Business Address</span>
                  </label>
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="Door No., Street, Area, City, State, Pincode"
                value={permanentAddress}
                onChange={e => {
                  setPermanentAddress(e.target.value);
                  if (permSameAsRes && e.target.value !== residentialAddress) setPermSameAsRes(false);
                  if (permSameAsOffice && e.target.value !== officeAddress) setPermSameAsOffice(false);
                }}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 4. IDENTITY / REFERENCE DETAILS */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Identity / Reference Details
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Aadhaar Number *</label>
                <input
                  type="text"
                  required
                  placeholder="xxxx-xxxx-xxxx"
                  value={aadhaarNumber}
                  onChange={e => setAadhaarNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PAN Card Number *</label>
                <input
                  type="text"
                  required
                  placeholder="ABCDE1234F"
                  value={panNumber}
                  onChange={e => setPanNumber(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference Person Name</label>
                <input
                  type="text"
                  placeholder="Guarantor / Referee Name"
                  value={referenceName}
                  onChange={e => setReferenceName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference Contact Mobile</label>
                <input
                  type="text"
                  placeholder="Referee Mobile Number"
                  value={referenceContact}
                  onChange={e => setReferenceContact(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 5. PROFILE PHOTO */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Profile Photo
              </h4>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-2">Passport Size Photo *</label>
              <div className="flex items-center space-x-6">
                {/* Passport photo upload box */}
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className={`w-28 h-36 border-2 ${
                    photoUrl
                      ? 'border-emerald-500 bg-white shadow-xs'
                      : 'border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50'
                  } rounded-xl flex flex-col items-center justify-center p-1 text-center cursor-pointer transition-all overflow-hidden relative group`}
                >
                  {photoUrl ? (
                    <>
                      <img
                        src={photoUrl}
                        alt="Passport Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                        Change Photo
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                      <Camera className="w-6 h-6 mb-1 text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-600">Upload Photo</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">Passport size</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {photoUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>✓ Photo uploaded</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Change Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Remove Photo
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-sm">
                        Stored against the customer master profile. When this profile is selected as Borrower, Co-Borrower, or Guarantor, this photo will automatically appear on legal loan application documents.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Passport Photo</span>
                      </button>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        Upload candidate passport photograph (JPG, PNG). Stored on the master customer profile and rendered on loan origination agreements.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsNewProfileModalOpen(false);
                resetNewProfileForm();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <span>Save Profile Identity</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PROFILE MODAL (LIGHT THEME) */}
      <Modal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        title={`Edit Profile — ${selectedProfile?.id || ''}`}
        subtitle="Update reusable profile identity and KYC particulars."
        maxWidth="3xl"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-5 text-xs">
          {/* 1. PERSONAL DETAILS */}
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Personal Details
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nickname / Alias</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={e => setEditNickname(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Father's / Husband's Name</label>
                <input
                  type="text"
                  value={editFatherName}
                  onChange={e => setEditFatherName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={handleEditDobChange}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Age</label>
                  <span className="text-[10px] text-emerald-600 font-semibold font-mono">Auto calculated</span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editAge !== '' ? `${editAge} Years` : ''}
                  placeholder="Auto calculated"
                  className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Occupation / Business</label>
                <input
                  type="text"
                  value={editOccupation}
                  onChange={e => setEditOccupation(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editAnnualIncome}
                    onChange={e => setEditAnnualIncome(e.target.value)}
                    className="w-full pl-7 pr-3 p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. CONTACT DETAILS */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Contact Details
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Mobile *</label>
                <input
                  type="text"
                  required
                  value={editPrimaryPhone}
                  onChange={e => setEditPrimaryPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 3. ADDRESS DETAILS */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Address Details
              </h4>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office / Business Address</label>
              <textarea
                rows={2}
                value={editOfficeAddress}
                onChange={e => setEditOfficeAddress(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
              <textarea
                rows={2}
                value={editResidentialAddress}
                onChange={e => setEditResidentialAddress(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Permanent Address</label>
              <textarea
                rows={2}
                value={editPermanentAddress}
                onChange={e => setEditPermanentAddress(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 4. IDENTITY / REFERENCE DETAILS */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Identity / Reference Details
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  value={editAadhaar}
                  onChange={e => setEditAadhaar(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PAN Card Number</label>
                <input
                  type="text"
                  value={editPan}
                  onChange={e => setEditPan(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference Person Name</label>
                <input
                  type="text"
                  value={editReferenceName}
                  onChange={e => setEditReferenceName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference Contact</label>
                <input
                  type="text"
                  value={editReferenceContact}
                  onChange={e => setEditReferenceContact(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 5. PROFILE PHOTO */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Profile Photo
              </h4>
            </div>

            <div className="flex items-center space-x-6">
              <div
                onClick={() => editPhotoInputRef.current?.click()}
                className={`w-28 h-36 border-2 ${
                  editPhotoUrl
                    ? 'border-emerald-500 bg-white shadow-xs'
                    : 'border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50'
                } rounded-xl flex flex-col items-center justify-center p-1 text-center cursor-pointer transition-all overflow-hidden relative group`}
              >
                {editPhotoUrl ? (
                  <>
                    <img
                      src={editPhotoUrl}
                      alt="Passport Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                      Change Photo
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                    <Camera className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-600">Upload Photo</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Passport size</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  ref={editPhotoInputRef}
                  accept="image/*"
                  onChange={handleEditPhotoUpload}
                  className="hidden"
                />

                {editPhotoUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>✓ Photo attached</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => editPhotoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPhotoUrl('')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editPhotoInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Passport Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsEditProfileModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
