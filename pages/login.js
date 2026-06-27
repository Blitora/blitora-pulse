// pages/login.js — redirect all /login traffic to /
import { useEffect } from 'react';
import { useRouter } from 'next/router';
export default function LoginRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/'); }, [router]);
    return null;
}
