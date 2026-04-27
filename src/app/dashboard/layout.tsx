"use client";
import { CourseLayout } from "@/components/layout/CourseLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <CourseLayout>{children}</CourseLayout>;
}
