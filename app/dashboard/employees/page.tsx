"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import {
  UserPlus,
  Users,
  Building,
  Briefcase,
  X,
} from "lucide-react";
import {
  getEmployees,
  getDepartments,
  getPositions,
  addEmployee,
} from "@/lib/api";

interface Employee {
  EmployeeID: number;
  FullName: string;
  Department: string | null;
  Position: string | null;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    FullName: "",
    Email: "",
    DateOfBirth: "",
    Gender: "",
    PhoneNumber: "",
    HireDate: "",
    DepartmentID: "",
    PositionID: "",
    Status: "Active",
  });

  const { data: employees, isLoading, mutate } = useSWR("employees", getEmployees);
  const { data: departments } = useSWR("departments", getDepartments);
  const { data: positions } = useSWR("positions", getPositions);

  const columns = [
    {
      key: "FullName",
      header: "Employee",
      sortable: true,
      render: (item: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar name={item.FullName} size="sm" />
          <div>
            <p className="font-medium text-foreground">{item.FullName}</p>
            <p className="text-xs text-muted-foreground">ID: {item.EmployeeID}</p>
          </div>
        </div>
      ),
    },
    {
      key: "Department",
      header: "Department",
      sortable: true,
      render: (item: Employee) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span>{item.Department || "-"}</span>
        </div>
      ),
    },
    {
      key: "Position",
      header: "Position",
      sortable: true,
      render: (item: Employee) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span>{item.Position || "-"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Employee) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/employees/${item.EmployeeID}`);
          }}
        >
          View Profile
        </Button>
      ),
    },
  ];

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const payload = {
        ...formData,
        DepartmentID: formData.DepartmentID ? parseInt(formData.DepartmentID) : undefined,
        PositionID: formData.PositionID ? parseInt(formData.PositionID) : undefined,
      };

      const response = await addEmployee(payload);
      if (response.status === "success") {
        toast("Employee added successfully!", "success");
        setShowAddModal(false);
        setFormData({
          FullName: "",
          Email: "",
          DateOfBirth: "",
          Gender: "",
          PhoneNumber: "",
          HireDate: "",
          DepartmentID: "",
          PositionID: "",
          Status: "Active",
        });
        mutate();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add employee";
      toast(message, "error");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground">
            Manage your workforce directory
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Employees</p>
            <p className="text-2xl font-bold text-foreground">
              {employees?.length || 0}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Departments</p>
            <p className="text-2xl font-bold text-foreground">
              {departments?.length || 0}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Positions</p>
            <p className="text-2xl font-bold text-foreground">
              {positions?.length || 0}
            </p>
          </div>
        </Card>
      </div>

      {/* Employee Table */}
      <DataTable
        data={employees || []}
        columns={columns}
        searchKey="FullName"
        searchPlaceholder="Search employees..."
        pageSize={10}
        isLoading={isLoading}
        onRowClick={(item) => router.push(`/dashboard/employees/${item.EmployeeID}`)}
        emptyState={{
          icon: "users",
          title: "No employees found",
          description: "Start by adding your first employee",
        }}
      />

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Add New Employee</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  value={formData.FullName}
                  onChange={(e) =>
                    setFormData({ ...formData, FullName: e.target.value })
                  }
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) =>
                    setFormData({ ...formData, Email: e.target.value })
                  }
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.PhoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, PhoneNumber: e.target.value })
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
                  placeholder="Select gender"
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.DateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, DateOfBirth: e.target.value })
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
                  placeholder="Select department"
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
                  placeholder="Select position"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isAdding}>
                  Add Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
