import Image from "next/image";

export default function ActicallyMark({ className }: { className?: string }) {
  return <Image src="/brand/actically-project-logo.png" alt="" aria-hidden="true" width={56} height={56} className={className} />;
}
