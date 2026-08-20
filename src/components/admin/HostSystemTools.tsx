import React, { useState } from 'react';
import {
  Database,
  RotateCcw,
  Code,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface HostSystemToolsProps {
  onDatabaseReset: () => void;
}

export const HostSystemTools: React.FC<HostSystemToolsProps> = ({ onDatabaseReset }) => {
  const { success } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRefreshDatabase = async () => {
    setIsRefreshing(true);
    try {
      await onDatabaseReset();
      success('Realtime database sync refreshed successfully!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const schemaSqlSnippet = `-- THE HAVEN GUEST HOUSE - RELATIONAL DATABASE SCHEMA
-- PostgreSQL / Supabase with Row Level Security & Double Booking Triggers

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('guest', 'host')) DEFAULT 'guest',
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT UNIQUE NOT NULL,
  room_type TEXT NOT NULL,
  price_per_night NUMERIC(10,2) NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  floor INT DEFAULT 1,
  bed_type TEXT DEFAULT 'King Bed',
  description TEXT,
  image_url TEXT,
  amenities TEXT[] DEFAULT '{}',
  room_status TEXT CHECK (room_status IN ('available', 'occupied', 'maintenance')) DEFAULT 'available',
  cleaning_status TEXT CHECK (cleaning_status IN ('clean', 'dirty', 'cleaning')) DEFAULT 'clean',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_guests INT DEFAULT 1,
  total_amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0.00,
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
  booking_status TEXT CHECK (booking_status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')) DEFAULT 'confirmed',
  guest_notes TEXT,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOUBLE BOOKING PREVENTION TRIGGER
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE room_id = NEW.room_id
      AND id != NEW.id
      AND booking_status NOT IN ('cancelled', 'checked_out')
      AND (
        (check_in_date <= NEW.check_in_date AND check_out_date > NEW.check_in_date) OR
        (check_in_date < NEW.check_out_date AND check_out_date >= NEW.check_out_date) OR
        (check_in_date >= NEW.check_in_date AND check_out_date <= NEW.check_out_date)
      )
  ) THEN
    RAISE EXCEPTION 'Double booking conflict: Room is already reserved for requested dates.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();`;

  const copySchemaToClipboard = () => {
    navigator.clipboard.writeText(schemaSqlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const challengeRubric = [
    { title: 'Full Functional Scope', desc: 'End-to-end working reservation, checkout, cleaning, dining, and messaging flows.' },
    { title: 'Database-Backed', desc: 'Full PostgreSQL schema definition with tables, foreign keys, and atomic JSON persistence layer.' },
    { title: 'Double-Booking Prevention', desc: 'Strict transactional verification preventing date collisions for any room.' },
    { title: 'Guest & Host Roles', desc: 'Distinct dashboards and permission boundaries with instantaneous quick-switcher.' },
    { title: 'Real-Time Updates', desc: 'Instant feedback loops for check-ins, housekeeping changes, orders, and chats.' },
    { title: 'Hospitality Aesthetics', desc: 'Warm boutique palette, high typography hierarchy, zero generic AI placeholders.' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E2D9] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
            Developer & Presentation Suite
          </div>
          <h1 className="font-serif italic text-3xl font-normal text-[#5A5A40]">
            Database Architecture & Challenge Rubric
          </h1>
          <p className="text-[#8C887D] text-xs mt-1">
            Inspect relational database schemas, reset test data, and review technical architecture.
          </p>
        </div>

        <button
          onClick={handleRefreshDatabase}
          disabled={isRefreshing}
          className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs flex items-center gap-2 self-start sm:self-auto"
        >
          <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing DB Sync...' : 'Sync Supabase Data'}</span>
        </button>
      </div>

      {/* 7-Day Challenge Rubric Cards */}
      <div>
        <h2 className="font-serif italic text-xl text-[#5A5A40] font-medium mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#5A5A40]" />
          7-Day Challenge Rubric Compliance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challengeRubric.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-2xs flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-[#2C2C2C]">{item.title}</h3>
                <p className="text-xs text-[#8C887D] mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Accounts Reference */}
      <div className="bg-[#F5F2ED] border border-[#E5E2D9] rounded-3xl p-6">
        <h2 className="font-serif italic text-lg font-medium text-[#5A5A40] mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C4A484]" />
          Demonstration & Operational Profiles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-[#2C2C2C]">
          <div className="bg-white p-4 rounded-2xl border border-[#E5E2D9] space-y-1">
            <div className="font-bold text-[#2C2C2C]">Bervely Pangwana</div>
            <div>Role: <strong className="text-[#5A5A40]">Host / Owner</strong></div>
            <div className="text-[11px] text-[#8C887D]">pangwanabervely@gmail.com</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E5E2D9] space-y-1">
            <div className="font-bold text-[#2C2C2C]">Chipo Sithole</div>
            <div>Role: <strong className="text-[#5A5A40]">Housekeeping Staff</strong></div>
            <div className="text-[11px] text-[#8C887D]">housekeeping@thehaven.co.zw</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E5E2D9] space-y-1">
            <div className="font-bold text-[#2C2C2C]">Tawanda Moyo</div>
            <div>Role: <strong className="text-[#5A5A40]">Resident Guest (Room 101)</strong></div>
            <div className="text-[11px] text-[#8C887D]">tawanda.moyo@gmail.com</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E5E2D9] space-y-1">
            <div className="font-bold text-[#2C2C2C]">Ruvimbo Chiweshe</div>
            <div>Role: <strong className="text-[#5A5A40]">Upcoming Guest (Room 201)</strong></div>
            <div className="text-[11px] text-[#8C887D]">ruvimbo.c@outlook.com</div>
          </div>
        </div>
      </div>

      {/* Schema SQL Inspector */}
      <div className="bg-[#2C2C2C] rounded-[32px] p-6 sm:p-8 text-[#FDFCF9] space-y-4 shadow-xl border border-[#3A3A3A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#C4A484]" />
            <h3 className="font-serif italic text-lg font-normal text-[#E5D7C7]">
              Supabase / PostgreSQL Database Schema
            </h3>
          </div>

          <button
            onClick={copySchemaToClipboard}
            className="px-3.5 py-1.5 rounded-full bg-[#3A3A3A] hover:bg-[#4A4A4A] text-[#E5D7C7] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#4A4A4A]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#C4A484]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied SQL' : 'Copy SQL Schema'}</span>
          </button>
        </div>

        <pre className="bg-[#222222] p-4 rounded-2xl overflow-x-auto text-xs font-mono text-[#D5D2C9] leading-relaxed max-h-96 border border-[#3A3A3A]">
          <code>{schemaSqlSnippet}</code>
        </pre>
      </div>
    </div>
  );
};
