"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";
import { BottomNav } from "@/components/bottom-nav";
import SendPaymentSheet from "@/components/home/send-payment-sheet";

export function LayoutWrapper({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    // Check if we're on a payment link page
    const isPaymentLinkPage = pathname?.startsWith("/pay/");

    return (
        <>
            {/* Only show navigation for non-payment-link pages */}
            {!isPaymentLinkPage && (
                <>
                    <TopNav />
                    <SendPaymentSheet hideTrigger />
                    <BottomNav />
                </>
            )}
            {children}
        </>
    );
}