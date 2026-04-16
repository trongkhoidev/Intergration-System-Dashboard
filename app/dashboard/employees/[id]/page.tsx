"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Building,
  Briefcase,
  User,
  Save,
  X,
} from "lucide-react";
import {
  getEmployeeDetail,
  getDepartments,
  getPositions,
  updateEmployee,
  deleteEmployee,
} from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EmployeeProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "salary" | "attendance">("info");

  const { data: employee, isLoading, mutate } = useSWR(
    id ? `employee-${id}` : null,
    () => getEmployeeDetail(parseInt(id))
  );

  const { data: departments } = useSWR("departments", getDepartments);
  const { data: positions } = useSWR("positions", getPositions);

  const [formData, setFormData] = useState({
    FullName: "",
    Email: "",
    DateOfBirth: "",
    Gender: "",
    PhoneNumber: "",
    HireDate: "",
    DepartmentID: "",
    PositionID: "",
    Status: "",
  });

  // Initialize form data when employee data loads
  const initFormData = () => {
    if (employee) {
      setFormData({
        FullName: employee.FullName || "",
        Email: employee.Email || "",
        DateOfBirth: employee.DateOfBirth || "",
        Gender: employee.Gender || "",
        PhoneNumber: employee.PhoneNumber || "",
        HireDate: employee.HireDate || "",
        DepartmentID: employee.DepartmentID?.toString() || "",
        PositionID: employee.PositionID?.toString() || "",
        Status: employee.Status || "",
      });
    }
  };

  const handleEdit = () => {
    initFormData();
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    initFormData();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        DepartmentID: formData.DepartmentID ? parseInt(formData.DepartmentID) : undefined,
        PositionID: formData.PositionID ? parseInt(formData.PositionID) : undefined,
      };

      const response = await updateEmployee(parseInt(id), payload);
      if (response.status === "success") {
        toast("Employee updated successfully!", "success");
        setIsEditing(false);
        mutate();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update employee";
      toast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteEmployee(parseInt(id));
      if (response.status === "success") {
        toast("Employee deleted successfully!", "success");
        router.push("/dashboard/employees");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete employee";
      toast(message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-muted-foreground">Employee not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "default"> = {
      Active: "success",
      OnLeave: "warning",
      Inactive: "destructive",
      Terminated: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const tabs = [
    { id: "info" as const, label: "Personal Info" },
    { id: "salary" as const, label: "Salary History" },
    { id: "attendance" as const, label: "Attendance Logs" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Employees</span>
      </button>

      {/* Profile Header */}
      <div className="relative rounded-xl border border-border bg-gradient-to-r from-card via-card to-primary/5 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar name={employee.FullName} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">
                {employee.FullName}
              </h1>
              {getStatusBadge(employee.Status)}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                {employee.PositionName || "No position"}
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="h-4 w-4" />
                {employee.DepartmentName || "No department"}
              </span>
              {employee.HireDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(employee.HireDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} isLoading={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <Input
                    label="Full Name"
                    value={formData.FullName}
                    onChange={(e) =>
                      setFormData({ ...formData, FullName: e.target.value })
                    }
                  />
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={formData.DateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, DateOfBirth: e.target.value })
                    }
                  />
                  <Select
                    label="Gender"
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                    value={formData.Gender}
                    onChange={(e) =>
                      setFormData({ ...formData, Gender: e.target.value })
                    }
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Full Name" value={employee.FullName} />
                  <InfoRow
                    label="Date of Birth"
                    value={employee.DateOfBirth ? formatDate(employee.DateOfBirth) : "-"}
                  />
                  <InfoRow label="Gender" value={employee.Gender || "-"} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Mail className="h-5 w-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <Input
                    label="Email"
                    type="email"
                    value={formData.Email}
                    onChange={(e) =>
                      setFormData({ ...formData, Email: e.target.value })
                    }
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    value={formData.PhoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, PhoneNumber: e.target.value })
                    }
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Email" value={employee.Email || "-"} icon={<Mail className="h-4 w-4" />} />
                  <InfoRow label="Phone" value={employee.PhoneNumber || "-"} icon={<Phone className="h-4 w-4" />} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Briefcase className="h-5 w-5 text-primary" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isEditing ? (
                  <>
                    <Select
                      label="Department"
                      options={
                        departments?.map((d) => ({
                          value: d.DepartmentID.toString(),
                          label: d.DepartmentName,
                        })) || []
                      }
                      value={formData.DepartmentID}
                      onChange={(e) =>
                        setFormData({ ...formData, DepartmentID: e.target.value })
                      }
                    />
                    <Select
                      label="Position"
                      options={
                        positions?.map((p) => ({
                          value: p.PositionID.toString(),
                          label: p.PositionName,
                        })) || []
                      }
                      value={formData.PositionID}
                      onChange={(e) =>
                        setFormData({ ...formData, PositionID: e.target.value })
                      }
                    />
                    <Input
                      label="Hire Date"
                      type="date"
                      value={formData.HireDate}
                      onChange={(e) =>
                        setFormData({ ...formData, HireDate: e.target.value })
                      }
                    />
                    <Select
                      label="Status"
                      options={[
                        { value: "Active", label: "Active" },
                        { value: "OnLeave", label: "On Leave" },
                        { value: "Inactive", label: "Inactive" },
                        { value: "Terminated", label: "Terminated" },
                      ]}
                      value={formData.Status}
                      onChange={(e) =>
                        setFormData({ ...formData, Status: e.target.value })
                      }
                    />
                  </>
                ) : (
                  <>
                    <InfoRow label="Department" value={employee.DepartmentName || "-"} />
                    <InfoRow label="Position" value={employee.PositionName || "-"} />
                    <InfoRow
                      label="Hire Date"
                      value={employee.HireDate ? formatDate(employee.HireDate) : "-"}
                    />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      {getStatusBadge(employee.Status)}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "salary" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Salary History
              </h3>
              <p className="text-sm text-muted-foreground">
                Salary records will be displayed here. Check the Payroll page for detailed information.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/dashboard/payroll")}
              >
                View Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Attendance Logs
              </h3>
              <p className="text-sm text-muted-foreground">
                Attendance records will be displayed here. Check the Attendance page for detailed information.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/dashboard/attendance")}
              >
                View Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Delete Employee
            </h2>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete {employee.FullName}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground flex items-center gap-2">
        {icon}
        {value}
      </span>
    </div>
  );
}
