import { useState } from "react";
import { Save, Bell, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "../../hooks/use-toast";
import { BACKEND_URL } from "../../constants";
import { getSessionAuthToken } from "../../api/auth";

export default function PreferencesTab({ profileData, setProfileData }) {
  const { toast } = useToast();
  const token = getSessionAuthToken(); 
  
  const [formData, setFormData] = useState({
    email: profileData?.notifications?.email ?? true,
    sms: profileData?.notifications?.sms ?? false,
    timeZone: profileData?.timeZone || "America/Los_Angeles",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (field, checked) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const handleTimeZoneChange = (value) => {
    setFormData((prev) => ({ ...prev, timeZone: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
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
        timeZone: formData.timeZone
      }));

      toast({
        title: "Preferences saved",
        description: "Your notification and system preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error saving preferences",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

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
            <Select value={formData.timeZone} onValueChange={handleTimeZoneChange}>
              <SelectTrigger id="timezone" className="bg-white border-gray-300">
                <SelectValue placeholder="Select Time Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                <SelectItem value="Pacific/Honolulu">Hawaii-Aleutian Time (HAT)</SelectItem>
              </SelectContent>
            </Select>
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
