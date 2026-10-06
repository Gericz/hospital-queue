import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import ThermalTicket, { TicketData } from '@/Components/Ticket/ThermalTicket';
import { printThermalElement } from '@/lib/ticketPrinter';

export interface HospitalSettingsForTicket {
    name: string;
    tagline?: string | null;
    ticket_header?: string | null;
    ticket_footer?: string | null;
    ticket_width?: '58mm' | '80mm' | string;
    show_patient_name?: boolean;
}

interface TicketPrintPreviewModalProps {
    show: boolean;
    onClose: () => void;
    ticket: TicketData | null;
    hospital?: HospitalSettingsForTicket;
    onPrint?: () => void;
}

export default function TicketPrintPreviewModal({
    show,
    onClose,
    ticket,
    hospital,
    onPrint,
}: TicketPrintPreviewModalProps) {
    const [selectedWidth, setSelectedWidth] = useState<'58mm' | '80mm'>(
        (ticket?.width as '58mm' | '80mm') ||
            (hospital?.ticket_width as '58mm' | '80mm') ||
            '80mm'
    );
    const [isPrinting, setIsPrinting] = useState<boolean>(false);

    if (!ticket) return null;

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            await printThermalElement('preview-thermal-ticket', selectedWidth);
            if (onPrint) {
                onPrint();
            }
        } catch (e) {
            console.error('Printing failed:', e);
            window.print();
        } finally {
            setIsPrinting(false);
        }
    };

    const trackingUrl =
        ticket.status_url ||
        (typeof window !== 'undefined'
            ? `${window.location.origin}/queue/status/${ticket.public_token}`
            : `/queue/status/${ticket.public_token}`);

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="bg-slate-900 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 text-lg">
                            🖨️
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center space-x-2">
                                <span>Ticket Print Preview</span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    {selectedWidth}
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                Review queue slip layout before printing
                            </p>
                        </div>
                    </div>

                    {/* Paper Width Selector */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                        <button
                            type="button"
                            onClick={() => setSelectedWidth('58mm')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                selectedWidth === '58mm'
                                    ? 'bg-cyan-500 text-slate-950 shadow'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            58mm
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedWidth('80mm')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                selectedWidth === '80mm'
                                    ? 'bg-cyan-500 text-slate-950 shadow'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            80mm
                        </button>
                    </div>
                </div>

                {/* Preview Body with Thermal Paper Styling */}
                <div className="p-6 bg-slate-950/60 max-h-[65vh] overflow-y-auto flex flex-col items-center justify-center">
                    <div className="relative group my-2">
                        {/* Thermal Paper Realistic Container */}
                        <div
                            className={`bg-white text-black font-mono shadow-2xl rounded-sm p-1 transition-all ${
                                selectedWidth === '58mm' ? 'w-[58mm] min-w-[240px]' : 'w-[80mm] min-w-[320px]'
                            }`}
                        >
                            <ThermalTicket
                                id="preview-thermal-ticket"
                                ticket={{
                                    ...ticket,
                                    width: selectedWidth,
                                }}
                                hospitalName={hospital?.name || 'MedQueue Medical Center'}
                                hospitalTagline={hospital?.tagline || undefined}
                                ticketHeader={hospital?.ticket_header || undefined}
                                showPatientName={hospital?.show_patient_name ?? true}
                            />
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition flex items-center space-x-1.5"
                    >
                        <span>📱</span>
                        <span>Open Mobile Tracking Screen ↗</span>
                    </a>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                        >
                            Close
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center space-x-2"
                        >
                            <span>🖨️</span>
                            <span>{isPrinting ? 'Sending to Printer...' : 'Print Ticket Slip'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
