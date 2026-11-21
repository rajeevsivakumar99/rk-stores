import Link from "next/link";
export default function NotFound() {
  return <div className="mx-auto mt-20 max-w-md card text-center"><h1 className="text-lg font-bold">Page not found</h1><Link href="/" className="btn mt-4">Go home</Link></div>;
}
