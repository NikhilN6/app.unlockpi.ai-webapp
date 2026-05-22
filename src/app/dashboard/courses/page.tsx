import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { arraysCourse } from "@/features/courses/arrays/lib/arrays-course";
import Image from "next/image";

export default function CoursesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="space-y-1">
          {/* <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Courses</p> */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Learning path</h1>
            <p className=" max-w-3xl text-sm leading-6 text-muted-foreground">
              Step-by-step paths to mastery
            </p>
            {/* <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              These are built as teaching surfaces, not document dumps. You enter a course,
              move lesson by lesson, and later the voice layer can sit on top without changing
              the structure.
            </p> */}
          </div>
        </section>

        <section className="rounded-lg border border-border/70 ">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between max-w-xl border border-white">
            <Image src={"/array-image.png"} alt="Array Image" width={300} height={200} />
            <div className="max-w-3xl -bg-conic-0mt-10 space-y-3">
              {/* <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Available now
              </p> */}
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">{arraysCourse.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Positions, indexing, updating, shifting, and traversal taught through a more
                  visual, interactive lesson flow.
                </p>
                <Button className="gap-2" render={<Link href={arraysCourse.coursePath} />}>
                  Open Arrays
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              {/* <div className="flex flex-col items-start gap-2 lg:items-end">

                <p className="max-w-56 text-xs leading-5 text-muted-foreground lg:text-right">
                  Voice-ready seams are wired in, but kept quiet in the UI for now.
                </p>
              </div> */}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
