import { useEffect, useState } from "react";
import {
  Building,
  ChevronDown,
  LockKeyhole,
  Save,
  Stethoscope,
  UserCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { useToast } from "../../hooks/use-toast";
import { updateProfileData } from "../../api/profileApi";
import { useSelector } from "react-redux";

const READ_ONLY_NOTE =
  "Read-only fields are part of your registered identity and cannot be changed here.";

const US_STATE_OPTIONS = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

export default function ProfileTab({ profileData, setProfileData }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    middleName: "",
    secondaryEmail: "",
    specialty: "",
    subSpecialty: "",
    statesOfLicense: [],
    licenseNumber: "",
    transcriptPurging: "7",
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [licensePopoverOpen, setLicensePopoverOpen] = useState(false);
  const doctor = useSelector((state) => state.me.me);
  const doctorId = doctor?.doctor_email || doctor?.email || "user-dynamic";

  useEffect(() => {
    setFormData({
      middleName: profileData?.middleName || "",
      secondaryEmail: profileData?.secondaryEmail || "",
      specialty: profileData?.specialty || "",
      subSpecialty: profileData?.subSpecialty || "",
      statesOfLicense: profileData?.statesOfLicense || [],
      licenseNumber: profileData?.licenseNumber || "",
      enable_transcript_purging : profileData?.enable_transcript_purging || "yes",
      transcript_purging_time : profileData?.transcript_purging_time || "never",
      transcriptPurging: profileData?.transcript_purging?.[0]?.enabled === "no" 
        ? "never" 
        : (profileData?.transcript_purging?.[0]?.time_line || ""),
    });
    setErrors({});
  }, [profileData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (
      formData.secondaryEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.secondaryEmail.trim())
    ) {
      nextErrors.secondaryEmail = "Enter a valid secondary email.";
    }

    if (!formData.specialty.trim()) {
      nextErrors.specialty = "Specialty is required.";
    }

    if (!formData.licenseNumber.trim()) {
      nextErrors.licenseNumber = "License number is required.";
    }

    if (!formData.statesOfLicense.length) {
      nextErrors.statesOfLicense = "Select at least one state of license.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleStateToggle = (stateName, checked) => {
    setFormData((current) => ({
      ...current,
      statesOfLicense: checked
        ? [...new Set([...current.statesOfLicense, stateName])]
        : current.statesOfLicense.filter((state) => state !== stateName),
    }));
    setErrors((current) => ({ ...current, statesOfLicense: "" }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Construct backend payload format for purging
    const payloadFormData = {
      ...formData,
      enable_transcript_purging : "yes",
      transcript_purging_time : formData.transcript_purging_time === "never" ? "" : formData.transcript_purging_time
    };

    setIsSaving(true);
    try {
      const response = await updateProfileData(doctorId, payloadFormData);
      if (response.success) {
        setProfileData(response.data);
        toast({
          title: "Profile updated",
          description: "Your allowed profile fields were saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Unable to save profile",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const readOnlyInputClass = "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed select-none";

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-2xl bg-white/80 backdrop-blur-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-blue-50 p-3 text-blue-600">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Role
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {profileData?.role || "Not assigned"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-2xl bg-white/80 backdrop-blur-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-sky-50 p-3 text-sky-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Specialty
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {profileData?.specialty || "Not provided"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-2xl bg-white/80 backdrop-blur-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-slate-100 p-3 text-slate-600">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Account
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {profileData?.accountType || "Clinic"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Basic Profile Information</CardTitle>
          <CardDescription>
            Review your registered information and update only the fields that
            are allowed to change.
          </CardDescription>
          <Badge
            variant="outline"
            className="w-fit border-blue-200 bg-blue-50 text-blue-700"
          >
            {READ_ONLY_NOTE}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={profileData?.firstName || ""}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              name="middleName"
              value={formData.middleName}
              onChange={handleChange}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={profileData?.lastName || ""}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={profileData?.role || ""}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryEmail">Primary Email</Label>
            <Input
              id="primaryEmail"
              value={profileData?.primaryEmail || ""}
              disabled
              className={readOnlyInputClass}
            />
            <p className="text-xs text-gray-500">
              Used for sign-in and primary clinic communication.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryEmail">Secondary Email</Label>
            <Input
              id="secondaryEmail"
              name="secondaryEmail"
              type="email"
              value={formData.secondaryEmail}
              onChange={handleChange}
              placeholder="Optional backup contact"
            />
            {errors.secondaryEmail ? (
              <p className="text-xs text-red-600">{errors.secondaryEmail}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Professional Information</CardTitle>
          <CardDescription>
            Keep your professional details up to date. Future releases may
            require re-verification for some fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="npiNumber">NPI Number</Label>
            <Input
              id="npiNumber"
              value={profileData?.npiNumber || ""}
              disabled
              className={`${readOnlyInputClass} md:w-1/2`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Input
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
            />
            {errors.specialty ? (
              <p className="text-xs text-red-600">{errors.specialty}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subSpecialty">Sub-specialty</Label>
            <Input
              id="subSpecialty"
              name="subSpecialty"
              value={formData.subSpecialty}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input
              id="licenseNumber"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
            />
            {errors.licenseNumber ? (
              <p className="text-xs text-red-600">{errors.licenseNumber}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Transcript Purging
            </Label>
            <select
              value={formData.transcript_purging_time || "7"}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  transcript_purging_time: e.target.value
                }))
              }
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>State(s) of License</Label>
            <Popover open={licensePopoverOpen} onOpenChange={setLicensePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between border-gray-300 bg-white text-left font-normal text-gray-900 hover:bg-white"
                >
                  <span className="truncate">
                    {formData.statesOfLicense.length
                      ? formData.statesOfLicense.join(", ")
                      : "Select state(s)"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] border border-gray-200 bg-white p-2 shadow-lg"
              >
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                  {US_STATE_OPTIONS.map((stateName) => {
                    const checked = formData.statesOfLicense.includes(stateName);

                    return (
                      <Label
                        key={stateName}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            handleStateToggle(stateName, Boolean(value))
                          }
                        />
                        <span className="text-gray-700">{stateName}</span>
                      </Label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-2 pt-1">
              {formData.statesOfLicense.map((state) => (
                <Badge
                  key={state}
                  variant="outline"
                  className="border-blue-200 bg-blue-50 text-blue-700"
                >
                  {state}
                </Badge>
              ))}
            </div>
            {errors.statesOfLicense ? (
              <p className="text-xs text-red-600">{errors.statesOfLicense}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Clinic Information</CardTitle>
          <CardDescription>
            Your clinic context is always visible and stays read-only so it can
            anchor data-sharing and access decisions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clinicName">Clinic / Practice Name</Label>
            <Input
              id="clinicName"
              value={profileData?.clinicName || ""}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Input
              id="accountType"
              value={profileData?.accountType || ""}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="clinicAddress">Clinic Address</Label>
            <Input
              id="clinicAddress"
              value={profileData?.clinicAddress || ""}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicId">Clinic ID</Label>
            <Input
              id="clinicId"
              value={profileData?.clinicId || "Assigned in a future release"}
              disabled
              className={readOnlyInputClass}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base">Security & Account Controls</CardTitle>
          </div>
          <CardDescription>
            These controls are audit-safe and read-only when managed by your
            organization’s authentication system.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lastLogin">Last Login</Label>
            <Input
              id="lastLogin"
              value={profileData?.lastLogin ? new Date(profileData.lastLogin).toLocaleString() : "Not recorded"}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authenticationMethod">Authentication Method</Label>
            <Input
              id="authenticationMethod"
              value={profileData?.security?.authenticationMethod || "Single sign-on"}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordManagedBy">Password Management</Label>
            <Input
              id="passwordManagedBy"
              value={profileData?.security?.passwordManagedBy || "Managed by clinic identity provider"}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionProtection">Session Protection</Label>
            <Input
              id="sessionProtection"
              value={profileData?.security?.sessionProtection || "Enabled"}
              disabled
              className={readOnlyInputClass}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-blue-500/25 px-6 rounded-xl"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
