"use client";

import { useMemo, useState } from "react";
import "./globals.css";
import { fakeReceipt } from "./utils/fonts";

const RECEIPT_LINES = [
  { label: "Amount", value: 200 },
  { label: "Sales tax", value: 10 },
  { label: "Delivery Charge", value: 70 },
];

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState("");

  const total = useMemo(
    () => RECEIPT_LINES.reduce((sum, line) => sum + line.value, 0),
    [],
  );

  const handlePrinterClick = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setReceiptDate(new Date().toUTCString());
      }
      return next;
    });
  };

  return (
    <div className="receiptPage">
      <div
        className={`printer ${isOpen ? "showReceipt" : ""}`}
        onClick={handlePrinterClick}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handlePrinterClick();
          }
        }}
        aria-label="Toggle receipt"
      >
        <div className="signal" />

        <div className="mouth">
          <div className={`paper ${fakeReceipt.className}`}>
            <h2 className="shopTitle">General Store</h2>
            <p className="date">{receiptDate}</p>

            <div className="paymentSection">
              {RECEIPT_LINES.map((line) => (
                <p key={line.label}>
                  {line.label}: {line.value} taka
                </p>
              ))}
            </div>

            <h5 className="totalAmount">Total: {total} taka</h5>
          </div>
        </div>
      </div>
    </div>
  );
}
