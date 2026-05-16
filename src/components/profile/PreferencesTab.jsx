import { useEffect, useState } from "react";
import { Save, Bell, Globe, Map, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../../hooks/use-toast";
import { BACKEND_URL } from "../../constants";
import { getSessionAuthToken } from "../../api/auth";
import { useTour } from "../tour/TourProvider";
import {
  DEFAULT_GUIDED_TOUR_ID,
  getGuidedTour,
  getGuidedTourPreferences,
  saveGuidedTourPreferences,
} from "../../lib/guidedTours";

export default function PreferencesTab({ profileData, setProfileData }) {
  const { toast } = useToast();
  const { startTour, stopTour, tour: contextualTour } = useTour();
  const token = getSessionAuthToken(); 
  const tour = getGuidedTour(DEFAULT_GUIDED_TOUR_ID);
  
  const [formData, setFormData] = useState({
    email: profileData?.notifications?.email ?? true,
    sms: profileData?.notifications?.sms ?? false,
    timeZone: profileData?.timeZone || "America/Los_Angeles",
    guidedToursEnabled: profileData?.guidedTours?.enabled ?? getGuidedTourPreferences().enabled,
  });
  const [isSaving, setIsSaving] = useState(false);

  const timeZoneOptions = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii-Aleutian Time (HAT)" },
  ];

  useEffect(() => {
    setFormData({
      email: profileData?.notifications?.email ?? true,
      sms: profileData?.notifications?.sms ?? false,
      timeZone: profileData?.timeZone || "America/Los_Angeles",
      guidedToursEnabled: profileData?.guidedTours?.enabled ?? getGuidedTourPreferences().enabled,
    });
  }, [profileData]);

  const handleToggle = (field, checked) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const handleTimeZoneChange = (value) => {
    setFormData((prev) => ({ ...prev, timeZone: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const savedGuidedTours = saveGuidedTourPreferences({
      enabled: formData.guidedToursEnabled
    });

    if (!formData.guidedToursEnabled) {
      stopTour();
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/standalone/profile/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          notifications: {
            email: formData.email,
            sms: formData.sms
          },
          timeZone: formData.timeZone
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }

      setProfileData((prev) => ({
        ...prev,
        notifications: {
          email: formData.email,
          sms: formData.sms
        },
        timeZone: formData.timeZone,
        guidedTours: savedGuidedTours
      }));

      toast({
        title: "Preferences saved",
        description: "Your notification and system preferences have been updated.",
      });
    } catch (error) {
      setProfileData((prev) => ({
        ...prev,
        guidedTours: savedGuidedTours
      }));

      toast({
        title: "Error saving preferences",
        description: "Tour preferences were saved locally, but notification preferences could not be updated.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartTour = () => {
    const preferences = saveGuidedTourPreferences({ enabled: true });
    setFormData((prev) => ({ ...prev, guidedToursEnabled: true }));
    setProfileData((prev) => ({
      ...prev,
      guidedTours: preferences,
    }));

    startTour();
  };

  const currentTourStatus = contextualTour.active ? "active" : "not active";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose how you want to be notified about updates to your schedule or patients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="notify-email"
              checked={formData.email}
              onCheckedChange={(c) => handleToggle("email", Boolean(c))}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="notify-email" className="cursor-pointer text-sm font-medium">
                Email Notifications
              </Label>
              <p className="text-xs text-gray-500">
                Receive important updates and daily summaries at your primary email address.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="notify-sms"
              checked={formData.sms}
              onCheckedChange={(c) => handleToggle("sms", Boolean(c))}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="notify-sms" className="cursor-pointer text-sm font-medium">
                SMS Notifications
              </Label>
              <p className="text-xs text-gray-500">
                Receive urgent alerts and schedule changes directly to your registered mobile device.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Guided Tours</CardTitle>
          </div>
          <CardDescription>
            Control walkthrough prompts and restart the main product tour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="guided-tours-enabled"
              checked={formData.guidedToursEnabled}
              onCheckedChange={(c) => handleToggle("guidedToursEnabled", Boolean(c))}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="guided-tours-enabled" className="cursor-pointer text-sm font-medium">
                Enable Guided Tours
              </Label>
              <p className="text-xs text-gray-500">
                Show tour guidance and allow guided walkthroughs to continue between sessions.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{tour.name}</p>
              <p className="text-xs text-gray-500">
                Current status: {currentTourStatus}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleRestartTour}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart Tour
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">System Settings</CardTitle>
          </div>
          <CardDescription>
            Configure how the application responds to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="timezone">Time Zone</Label>
            <select
              id="timezone"
              value={formData.timeZone}
              onChange={(event) => handleTimeZoneChange(event.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {timeZoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 pt-1">
              Used for your appointments calendar and timestamps.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}
