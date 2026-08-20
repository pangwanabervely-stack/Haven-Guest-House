import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  RotateCcw,
  ShieldCheck,
  LogOut,
  BedDouble,
  Layers,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { Room, CleaningStatus } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface CleaningDashboardProps {
  rooms: Room[];
  onRefreshRooms: () => void;
  onLogout?: () => void;
}

export const CleaningDashboard: React.FC<CleaningDashboardProps> = ({
  rooms,
  onRefreshRooms,
  onLogout
}) => {
  const { currentUser, logout } = useAuth();
  const { success, error } = useToast();

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [floorFilter, setFloorFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);

  const handleUpdateCleaningStatus = async (roomId: string, newStatus: CleaningStatus) => {
    setUpdatingRoomId(roomId);
    try {
      // Cleaning staff ONLY updates cleaning_status, never room_status or prices
      await api.updateRoomCleaningStatus(roomId, newStatus);
      success(`Room marked as ${newStatus.replace('_', ' ')}!`);
      onRefreshRooms();
    } catch (err: any) {
      error(err.message || 'Failed to update cleaning status.');
    } finally {
      setUpdatingRoomId(null);
    }
  };

  const dirtyCount = rooms.filter((r) => r.cleaning_status === 'dirty').length;
  const inProgressCount = rooms.filter((r) => r.cleaning_status === 'in_progress').length;
  const cleanCount = rooms.filter((r) => r.cleaning_status === 'clean').length;
  const inspectedCount = rooms.filter((r) => r.cleaning_status === 'inspected').length;

  const filteredRooms = rooms.filter((room) => {
    const matchesStatus =
      filterStatus === 'All' ||
      room.cleaning_status === filterStatus ||
      (filterStatus === 'clean_all' && (room.cleaning_status === 'clean' || room.cleaning_status === 'inspected'));

    const matchesFloor =
      floorFilter === 'All' || (room.floor ? room.floor.toString() === floorFilter : floorFilter === '1');

    const matchesSearch =
      room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.room_type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesFloor && matchesSearch;
  });

  const getStatusBadge = (status: CleaningStatus) => {
    switch (status) {
      case 'dirty':
        return {
          label: 'Needs Cleaning',
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          dot: 'bg-rose-500'
        };
      case 'in_progress':
        return {
          label: 'Cleaning In Progress',
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500 animate-pulse'
        };
      case 'clean':
        return {
          label: 'Sanitized & Clean',
          bg: 'bg-[#F5F2ED] border-[#E5E2D9] text-[#5A5A40]',
          dot: 'bg-[#5A5A40]'
        };
      case 'inspected':
        return {
          label: 'Inspected & Ready',
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-600'
        };
      default:
        return {
          label: status,
          bg: 'bg-stone-50 border-stone-200 text-stone-700',
          dot: 'bg-stone-400'
        };
    }
  };

  const getOccupancyBadge = (roomStatus: string) => {
    switch (roomStatus) {
      case 'occupied':
        return {
          label: 'Guest In Suite',
          color: 'text-amber-700 bg-amber-50 border-amber-200'
        };
      case 'maintenance':
        return {
          label: 'Maintenance',
          color: 'text-rose-700 bg-rose-50 border-rose-200'
        };
      case 'cleaning':
        return {
          label: 'Turnover Lock',
          color: 'text-blue-700 bg-blue-50 border-blue-200'
        };
      default:
        return {
          label: 'Vacant',
          color: 'text-[#5A5A40] bg-[#F5F2ED] border-[#E5E2D9]'
        };
    }
  };

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] pb-16">
      {/* Top Header Bar for Housekeeping */}
      <div className="bg-[#2C2C2C] text-[#E5E2D9] border-b border-[#3E3E3E] sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-[#E5D7C7] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#C4A484] font-bold">
                The Haven Guest House
              </div>
              <div className="font-serif italic text-lg sm:text-xl font-normal text-[#FDFCF9]">
                Housekeeping Board
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <img
                src={
                  currentUser?.profile_image ||
                  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80'
                }
                alt="Housekeeping Staff"
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-white/20"
              />
              <div className="text-left">
                <div className="text-xs font-semibold text-white leading-tight">
                  {currentUser?.full_name || 'Staff Member'}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#C4A484] font-bold">
                  Housekeeping Staff
                </div>
              </div>
            </div>

            <button
              onClick={handleLogoutClick}
              className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#E5E2D9] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-white/10"
              title="Sign Out of Housekeeping"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Status Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setFilterStatus('dirty')}
            className={`p-5 rounded-3xl border cursor-pointer transition-all ${
              filterStatus === 'dirty'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/40 shadow-sm'
                : 'bg-white border-[#E5E2D9] hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-[#8C887D] font-bold">
                Needs Cleaning
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-3xl font-serif font-bold text-rose-700">{dirtyCount}</div>
            <div className="text-[11px] text-[#8C887D] mt-1 font-medium">Suites awaiting turnover</div>
          </div>

          <div
            onClick={() => setFilterStatus('in_progress')}
            className={`p-5 rounded-3xl border cursor-pointer transition-all ${
              filterStatus === 'in_progress'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                : 'bg-white border-[#E5E2D9] hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-[#8C887D] font-bold">
                In Progress
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-serif font-bold text-amber-700">{inProgressCount}</div>
            <div className="text-[11px] text-[#8C887D] mt-1 font-medium">Currently being sanitized</div>
          </div>

          <div
            onClick={() => setFilterStatus('clean')}
            className={`p-5 rounded-3xl border cursor-pointer transition-all ${
              filterStatus === 'clean'
                ? 'bg-[#F5F2ED] border-[#5A5A40] ring-2 ring-[#5A5A40]/40 shadow-sm'
                : 'bg-white border-[#E5E2D9] hover:border-[#5A5A40]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-[#8C887D] font-bold">
                Sanitized
              </span>
              <Check className="w-4 h-4 text-[#5A5A40]" />
            </div>
            <div className="text-3xl font-serif font-bold text-[#5A5A40]">{cleanCount}</div>
            <div className="text-[11px] text-[#8C887D] mt-1 font-medium">Clean & ready for inspection</div>
          </div>

          <div
            onClick={() => setFilterStatus('inspected')}
            className={`p-5 rounded-3xl border cursor-pointer transition-all ${
              filterStatus === 'inspected'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm'
                : 'bg-white border-[#E5E2D9] hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-[#8C887D] font-bold">
                Inspected
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-serif font-bold text-emerald-700">{inspectedCount}</div>
            <div className="text-[11px] text-[#8C887D] mt-1 font-medium">Quality-verified for guests</div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E2D9] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'All', label: 'All Suites' },
              { id: 'dirty', label: 'Dirty' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'clean', label: 'Clean' },
              { id: 'inspected', label: 'Inspected' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
                  filterStatus === tab.id
                    ? 'bg-[#5A5A40] text-white shadow-2xs'
                    : 'bg-[#FDFCF9] text-[#8C887D] border border-[#E5E2D9] hover:text-[#2C2C2C] hover:bg-[#F5F2ED]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Floor Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#8C887D] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Room..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#8C887D]" />
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="bg-[#FDFCF9] border border-[#E5E2D9] rounded-xl px-2.5 py-1.5 text-xs text-[#2C2C2C] font-medium focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              >
                <option value="All">All Floors</option>
                <option value="1">Ground / Floor 1</option>
                <option value="2">Floor 2</option>
              </select>
            </div>

            <button
              onClick={onRefreshRooms}
              className="p-2 rounded-xl bg-[#FDFCF9] border border-[#E5E2D9] text-[#8C887D] hover:text-[#5A5A40] transition-colors"
              title="Refresh Room List"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Room Cards Grid */}
        {filteredRooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E5E2D9] p-8">
            <CheckCircle2 className="w-12 h-12 text-[#5A5A40] mx-auto mb-3 opacity-60" />
            <h3 className="font-serif italic text-lg font-medium text-[#2C2C2C]">No Suites in this Filter</h3>
            <p className="text-xs text-[#8C887D] mt-1">All suites in this selection have been addressed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => {
              const statusInfo = getStatusBadge(room.cleaning_status);
              const occInfo = getOccupancyBadge(room.room_status);
              const isUpdating = updatingRoomId === room.id;

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    {/* Header: Room Number & Cleaning Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#8C887D] font-bold">
                          Suite {room.room_number}
                        </div>
                        <h3 className="font-serif italic text-xl font-normal text-[#2C2C2C] mt-0.5">
                          {room.room_type}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Room Attributes */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F5F2ED] text-xs">
                      <div className="flex items-center gap-1.5 text-[#8C887D]">
                        <Layers className="w-3.5 h-3.5 text-[#5A5A40]" />
                        <span>Floor {room.floor || 1}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#8C887D]">
                        <BedDouble className="w-3.5 h-3.5 text-[#5A5A40]" />
                        <span className="truncate">{room.bed_type || 'King Bed'}</span>
                      </div>
                    </div>

                    {/* Occupancy Indicator (NO FINANCIAL DATA) */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#8C887D] font-medium">Occupancy:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${occInfo.color}`}
                      >
                        {occInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Housekeeping Actions Bar */}
                  <div className="p-4 bg-[#FDFCF9] border-t border-[#E5E2D9] flex items-center justify-between gap-2 flex-wrap">
                    {/* Action 1: Start Cleaning */}
                    {room.cleaning_status === 'dirty' && (
                      <button
                        onClick={() => handleUpdateCleaningStatus(room.id, 'in_progress')}
                        disabled={isUpdating}
                        className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Start Cleaning
                      </button>
                    )}

                    {/* Action 2: Mark Clean */}
                    {(room.cleaning_status === 'in_progress' || room.cleaning_status === 'dirty') && (
                      <button
                        onClick={() => handleUpdateCleaningStatus(room.id, 'clean')}
                        disabled={isUpdating}
                        className="flex-1 py-2 px-3 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Clean
                      </button>
                    )}

                    {/* Action 3: Mark Inspected */}
                    {room.cleaning_status === 'clean' && (
                      <button
                        onClick={() => handleUpdateCleaningStatus(room.id, 'inspected')}
                        disabled={isUpdating}
                        className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Mark Inspected
                      </button>
                    )}

                    {/* Action 4: Flag Dirty / Re-clean if already clean or inspected */}
                    {room.cleaning_status !== 'dirty' && (
                      <button
                        onClick={() => handleUpdateCleaningStatus(room.id, 'dirty')}
                        disabled={isUpdating}
                        className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
                        title="Flag suite as needing cleaning turnover"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Flag Dirty
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
