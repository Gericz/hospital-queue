import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface TicketData {
    public_token: string;
    queue_number: string;
    display_number?: string;
    department_name?: string;
    service_name?: string;
    priority_type?: string;
    priority_label?: string;
    patient_name?: string | null;
    patient_reference?: string | null;
    created_at: string;
    footer?: string | null;
    width?: '58mm' | '80mm' | string;
    status_url?: string;
}

interface ThermalTicketProps {
    ticket: TicketData;
    id?: string;
    hospitalName?: string;
    hospitalTagline?: string;
    ticketHeader?: string;
    showPatientName?: boolean;
}

export default function ThermalTicket({
    ticket,
    id = 'printable-thermal-ticket',
    hospitalName = 'MedQueue Medical Center',
    hospitalTagline = 'Patient Flow & Care Management',
    ticketHeader,
    showPatientName = false,
}: ThermalTicketProps) {
    const is58mm = ticket.width === '58mm';
    const trackingUrl =
        typeof window !== 'undefined' && window.location.origin
            ? `${window.location.origin}/queue/status/${ticket.public_token}`
            : (ticket.status_url || `/queue/status/${ticket.public_token}`);

    return (
        <div
            id={id}
            className={`bg-white text-black font-mono mx-auto p-4 border border-dashed border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 ${
                is58mm ? 'w-[58mm] text-xs' : 'w-[80mm] text-sm'
            }`}
            style={{ minHeight: '110mm' }}
        >
            {/* Ticket Header */}
            <div className="text-center border-b border-black pb-3 mb-3">
                <div className="text-sm font-black uppercase tracking-wider">
                    {ticketHeader || hospitalName}
                </div>
                {hospitalTagline && (
                    <div className="text-[10px] text-slate-600 mt-0.5">{hospitalTagline}</div>
                )}
                <div className="text-[10px] text-slate-500 mt-1">{ticket.created_at}</div>
            </div>

            {/* Department & Service */}
            <div className="text-center mb-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-800">
                    {ticket.department_name}
                </div>
                <div className="text-xs font-semibold text-slate-600">
                    {ticket.service_name}
                </div>
            </div>

            {/* Main Queue Number */}
            <div className="text-center my-4 py-3 border-y-2 border-black">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    YOUR NUMBER
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight my-1">
                    {ticket.queue_number}
                </div>
                {ticket.priority_type && ticket.priority_type !== 'REGULAR' && (
                    <div className="inline-block mt-1 px-2 py-0.5 rounded border border-black font-bold text-[10px] uppercase">
                        ★ {ticket.priority_label || ticket.priority_type}
                    </div>
                )}
            </div>

            {/* Optional Patient Name / Reference */}
            {showPatientName && ticket.patient_name && (
                <div className="text-center text-xs mb-3 pb-2 border-b border-dashed border-slate-400">
                    <span className="text-slate-500 text-[10px]">Patient: </span>
                    <span className="font-bold">{ticket.patient_name}</span>
                </div>
            )}

            {/* QR Code Section for Live Mobile Tracking */}
            <div className="my-4 text-center flex flex-col items-center justify-center">
                <div className="bg-white p-1.5 border border-black rounded-lg inline-block">
                    <QRCodeSVG
                        value={trackingUrl}
                        size={is58mm ? 95 : 120}
                        level="M"
                        includeMargin={false}
                    />
                </div>
                <div className="text-[10px] font-bold uppercase mt-2 text-slate-800">
                    Scan to track queue on phone
                </div>
                <div className="text-[8px] text-slate-500 max-w-[200px] truncate mt-0.5">
                    {trackingUrl}
                </div>
            </div>

            {/* Ticket Footer Instructions */}
            <div className="text-center text-[10px] text-slate-600 border-t border-black pt-3 mt-3 leading-tight">
                {ticket.footer ||
                    'Please watch the display screen and listen for your ticket number. Have your valid ID, Patient Discharge Clearance, and documents ready.'}
            </div>

            <div className="text-center text-[8px] text-slate-400 mt-3 uppercase tracking-wider">
                MedQueue • System Generated
            </div>
        </div>
    );
}
