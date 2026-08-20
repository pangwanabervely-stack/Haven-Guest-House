import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BedDouble,
  User,
  ShieldCheck,
  Check,
  X,
  ClipboardCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { Room } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { useNotifications } from '../../context/NotificationContext';

interface HostCleaningProps {
  rooms: Room[];
  onRefreshRooms: () => void;
}

export const HostCleaning: React.FC<HostCleaningProps> = ({ rooms, onRefreshRooms }) => {
  const { success, error } = useToast();
  const { notifyRoomDirty } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [inspectingRoom, setInspectingRoom] = useState<Room | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    linens: true,
    bathroom: true,
    minibar: true,
    surfaces: true,
    climate: true
  });

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'clean') return r.cleaning_status === 'clean' || r.cleaning_status === 'inspected';
    return r.cleaning_status === filterStatus;
  });

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateCleaningStatus = async (
    roomId: string,
    newStatus: 'dirty' | 'in_progress' | 'clean' | 'inspected'
  ) => {
    const currentRoom = rooms.find((r) => r.id === roomId);
    try {
      const roomUpdates: Partial<Room> = { cleaning_status: newStatus as any };
      if (newStatus === 'clean' || newStatus === 'inspected') {
        if (currentRoom && currentRoom.room_status === 'cleaning') {
          roomUpdates.room_status = 'available';
        }
      }
      await api.updateRoom(roomId, roomUpdates);
      if (newStatus === 'dirty' && currentRoom) {
        notifyRoomDirty({
          roomNumber: currentRoom.room_number,
          roomId: currentRoom.id,
          reason: 'Housekeeping attention requested by host'
        });
      }
      success(
        newStatus === 'inspected'
          ? `Room ${currentRoom?.room_number || ''} quality inspection approved & ready for check-in!`
          : `Room marked as ${newStatus.replace('_', ' ')}!`
      );
      if (inspectingRoom?.id === roomId) {
        setInspectingRoom(null);
      }
      onRefreshRooms();
    } catch (err: any) {
      error(err.message || 'Failed to update cleaning status.');
    }
  };

  const dirtyCount = rooms.filter((r) => r.cleaning_status === 'dirty').length;
  const inProgressCount = rooms.filter((r) => r.cleaning_status === 'in_progress').length;
  const cleanCount = rooms.filter((r) => r.cleaning_status === 'clean' || r.cleaning_status === 'inspected').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E2D9] pb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
          Hygiene & Quality Assurance
        </div>
        <h1 className="font-serif italic text-3xl font-normal text-[#5A5A40]">
          Housekeeping & Room Sanitization Board
        </h1>
        <p className="text-[#8C887D] text-xs mt-1">
          Track room cleaning workflows, prioritize turn-downs after guest check-out, and maintain pristine standards.
        </p>
      </div>

      {/* Summary Stat Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterStatus('dirty')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all ${
            filterStatus === 'dirty'
              ? 'bg-[#F5F2ED] border-[#C4A484] ring-2 ring-[#C4A484]/40'
              : 'bg-white border-[#E5E2D9] hover:border-[#C4A484]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
              Needs Cleaning
            </span>
            <AlertTriangle className="w-4 h-4 text-[#C4A484]" />
          </div>
          <div className="text-3xl font-serif italic font-bold text-[#2C2C2C] mt-2">{dirtyCount}</div>
          <div className="text-xs text-[#8C887D] mt-1">Rooms flagged dirty</div>
        </div>

        <div
          onClick={() => setFilterStatus('in_progress')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all ${
            filterStatus === 'in_progress'
              ? 'bg-[#F5F2ED] border-[#5A5A40] ring-2 ring-[#5A5A40]/40'
              : 'bg-white border-[#E5E2D9] hover:border-[#5A5A40]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
              Cleaning In Progress
            </span>
            <Clock className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-3xl font-serif italic font-bold text-[#2C2C2C] mt-2">{inProgressCount}</div>
          <div className="text-xs text-[#8C887D] mt-1">Housekeeping staff active</div>
        </div>

        <div
          onClick={() => setFilterStatus('clean')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all ${
            filterStatus === 'clean'
              ? 'bg-[#F5F2ED] border-[#5A5A40] ring-2 ring-[#5A5A40]/40'
              : 'bg-white border-[#E5E2D9] hover:border-[#5A5A40]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
              Sanitized & Ready
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#5A5A40]" />
          </div>
          <div className="text-3xl font-serif italic font-bold text-[#5A5A40] mt-2">{cleanCount}</div>
          <div className="text-xs text-[#8C887D] mt-1">Ready for check-in</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['All', 'dirty', 'in_progress', 'clean'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
              filterStatus === st
                ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-2xs'
                : 'bg-white text-[#8C887D] border-[#E5E2D9] hover:text-[#2C2C2C]'
            }`}
          >
            {st === 'All' ? 'All Rooms' : st === 'clean' ? 'Sanitized / Clean' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Room Cards Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-[16/9] bg-[#F5F2ED]">
                <img
                  src={room.image_url}
                  alt={room.room_type}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#2C2C2C]/90 text-[#E5D7C7] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                  Room {room.room_number} • Floor {room.floor || 1}
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                      room.room_status === 'occupied'
                        ? 'bg-[#2C2C2C]/80 text-[#C4A484]'
                        : 'bg-[#2C2C2C]/80 text-[#E5D7C7]'
                    }`}
                  >
                    Occupancy: {room.room_status}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif italic text-base font-medium text-[#2C2C2C]">
                    {room.room_type} Suite
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                      room.cleaning_status === 'clean' || room.cleaning_status === 'inspected'
                        ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                        : room.cleaning_status === 'in_progress'
                        ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    ● {room.cleaning_status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-xs text-[#8C887D] space-y-1">
                  <div>Bed: {room.bed_type || 'King Bed'} (Max {room.capacity} Guests)</div>
                  <div>Includes: {room.amenities.slice(0, 2).join(', ')}</div>
                </div>
              </div>
            </div>

            {/* Quick Status Action Bar */}
            <div className="p-4 bg-[#FDFCF9] border-t border-[#E5E2D9] flex items-center justify-between gap-2 flex-wrap">
              {room.cleaning_status !== 'dirty' && (
                <button
                  onClick={() => handleUpdateCleaningStatus(room.id, 'dirty')}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs"
                >
                  Mark Dirty
                </button>
              )}

              {room.cleaning_status !== 'in_progress' && (
                <button
                  onClick={() => handleUpdateCleaningStatus(room.id, 'in_progress')}
                  className="px-3 py-1.5 bg-white hover:bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9] text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs"
                >
                  Start Cleaning
                </button>
              )}

              {room.cleaning_status !== 'clean' && (
                <button
                  onClick={() => handleUpdateCleaningStatus(room.id, 'clean')}
                  className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Clean
                </button>
              )}

              <button
                onClick={() => setInspectingRoom(room)}
                className="px-3.5 py-1.5 bg-[#2C2C2C] hover:bg-black text-[#E5D7C7] text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors shadow-2xs flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Inspect
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Housekeeping Inspection Quality Modal */}
      {inspectingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FDFCF9] rounded-[28px] shadow-2xl max-w-lg w-full overflow-hidden border border-[#E5E2D9]">
            {/* Modal Header */}
            <div className="bg-[#2C2C2C] text-white p-6 relative border-b border-[#3E3E3E]">
              <button
                onClick={() => setInspectingRoom(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#E5E2D9] hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-[10px] uppercase tracking-widest text-[#C4A484] font-bold mb-1">
                Quality Assurance Inspection
              </div>
              <h2 className="text-2xl font-serif italic font-normal text-[#FDFCF9]">
                Room {inspectingRoom.room_number} — {inspectingRoom.room_type} Suite
              </h2>
              <p className="text-xs text-[#E5E2D9]/80 mt-1">
                Floor {inspectingRoom.floor || 1} • Status: {inspectingRoom.room_status} • Bed: {inspectingRoom.bed_type || 'King Bed'}
              </p>
            </div>

            {/* Checklist Content */}
            <div className="p-6 space-y-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#8C887D] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#5A5A40]" />
                Sanitization & Readiness Standards Checklist
              </div>

              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E5E2D9]">
                {[
                  { key: 'linens', label: 'Fresh high-thread-count bed linens & pillows fitted' },
                  { key: 'bathroom', label: 'Bathroom fully sanitized, fresh towels & luxury toiletries' },
                  { key: 'minibar', label: 'Complimentary tea, spring water & minibar refreshed' },
                  { key: 'surfaces', label: 'All surfaces, handles, and mirrors streak-free & disinfected' },
                  { key: 'climate', label: 'Air conditioning/heating set to welcoming ambient temperature' }
                ].map((item) => {
                  const isChecked = Boolean(checklist[item.key]);
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleChecklistItem(item.key)}
                      className="flex items-center gap-3 cursor-pointer select-none text-xs text-[#2C2C2C] hover:text-[#5A5A40] transition-colors"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#5A5A40] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8C887D] shrink-0" />
                      )}
                      <span className={isChecked ? 'font-medium' : 'text-[#8C887D]'}>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleUpdateCleaningStatus(inspectingRoom.id, 'dirty')}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                >
                  Flag Needs Attention
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingRoom(null)}
                    className="px-4 py-2.5 bg-white hover:bg-[#F5F2ED] text-[#8C887D] border border-[#E5E2D9] text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCleaningStatus(inspectingRoom.id, 'clean')}
                    className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Mark Clean
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
