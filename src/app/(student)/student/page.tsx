import { redirect } from "next/navigation";

/** /student is the student slug; the public catalog stays at `/`. */
export default function StudentHome() {
  redirect("/");
}
