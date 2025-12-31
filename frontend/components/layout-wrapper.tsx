"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";
import { BottomNav } from "@/components/bottom-nav";
import SendPaymentSheet from "@/components/home/send-payment-sheet";
import SplitBillSheet from "@/components/home/split-bill-sheet";

export function LayoutWrapper({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    // Check if we're on a payment link page or claim page
    const isPaymentLinkPage = pathname?.startsWith("/pay/");
    const isClaimPage = pathname?.startsWith("/claim/");
    const shouldHideNav = isPaymentLinkPage || isClaimPage;

    return (
        <>
            {/* Only show navigation for main app pages */}
            {!shouldHideNav && (
                <>
                    <TopNav />
                    <SendPaymentSheet hideTrigger />
                    <SplitBillSheet hideTrigger />
                    <BottomNav />
                </>
            )}
            {children}
        </>
    );
}