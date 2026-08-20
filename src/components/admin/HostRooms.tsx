import React, { useState } from 'react';
import {
  BedDouble,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Sparkles,
  CheckCircle2,
  XCircle,
  Image as ImageIcon
} from 'lucide-react';
import { Room } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface HostRoomsProps {
  rooms: Room[];
  onRefreshRooms: () => void;
}

export const HostRooms: React.FC<HostRoomsProps> = ({ rooms, onRefreshRooms }) => {
  const { success, error } = useToast();
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Standard');
  const [pricePerNight, setPricePerNight] = useState(120);
  const [capacity, setCapacity] = useState(2);
  const [floor, setFloor] = useState(1);
  const [bedType, setBedType] = useState('Queen Bed');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [roomStatus, setRoomStatus] = useState<'available' | 'occupied' | 'maintenance'>('available');
  const [cleaningStatus, setCleaningStatus] = useState<'clean' | 'dirty' | 'cleaning'>('clean');
  const [amenitiesInput, setAmenitiesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setIsAddingNew(true);
    setEditingRoom(null);
    setRoomNumber(`10${rooms.length + 1}`);
    setRoomType('Standard');
    setPricePerNight(135);
    setCapacity(2);
    setFloor(1);
    setBedType('King Bed');
    setDescription('Cozy room with handcrafted wood furnishings and serene courtyard views.');
    setImageUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80');
    setRoomStatus('available');
    setCleaningStatus('clean');
    setAmenitiesInput('High-Speed Fiber Wi-Fi, King Bed, Ensuite Botanical Bathroom, Espresso Machine');
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setIsAddingNew(false);
    setRoomNumber(room.room_number);
    setRoomType(room.room_type);
    setPricePerNight(room.price_per_night);
    setCapacity(room.capacity);
    setFloor(room.floor || 1);
    setBedType(room.bed_type || 'King Bed');
    setDescription(room.description);
    setImageUrl(room.image_url);
    setRoomStatus(room.room_status);
    setCleaningStatus(room.cleaning_status);
    setAmenitiesInput(room.amenities.join(', '));
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const amenitiesArray = amenitiesInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      if (isAddingNew) {
        await api.createRoom({
          room_number: roomNumber,
          room_type: roomType,
          price_per_night: Number(pricePerNight),
          capacity: Number(capacity),
          floor: Number(floor),
          bed_type: bedType,
          description,
          image_url: imageUrl,
          gallery: [imageUrl],
          amenities: amenitiesArray,
          room_status: roomStatus,
          cleaning_status: cleaningStatus
        });
        success(`Room ${roomNumber} added to inventory!`);
      } else if (editingRoom) {
        await api.updateRoom(editingRoom.id, {
          room_number: roomNumber,
          room_type: roomType,
          price_per_night: Number(pricePerNight),
          capacity: Number(capacity),
          floor: Number(floor),
          bed_type: bedType,
          description,
          image_url: imageUrl,
          amenities: amenitiesArray,
          room_status: roomStatus,
          cleaning_status: cleaningStatus
        });
        success(`Room ${roomNumber} updated successfully!`);
      }

      setIsAddingNew(false);
      setEditingRoom(null);
      onRefreshRooms();
    } catch (err: any) {
      error(err.message || 'Failed to save room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNum: string) => {
    if (!window.confirm(`Are you sure you want to remove Room ${roomNum}?`)) return;
    try {
      await api.deleteRoom(roomId);
      success(`Room ${roomNum} deleted.`);
      onRefreshRooms();
    } catch (err: any) {
      error(err.message || 'Failed to delete room.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 mb-1">
            Property Accommodations Catalog
          </div>
          <h1 className="font-serif text-3xl font-medium text-stone-900">
            Room Inventory & Configurations
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Add new guest house suites, update nightly pricing, and manage operational room statuses.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Room & Type</th>
                <th className="px-6 py-3.5 font-semibold">Nightly Rate</th>
                <th className="px-6 py-3.5 font-semibold">Floor & Capacity</th>
                <th className="px-6 py-3.5 font-semibold">Room Status</th>
                <th className="px-6 py-3.5 font-semibold">Cleaning Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-stone-50/50">
                  {/* Photo & Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={room.image_url}
                        alt={room.room_type}
                        referrerPolicy="no-referrer"
                        className="w-14 h-11 rounded-lg object-cover border border-stone-200"
                      />
                      <div>
                        <div className="font-bold text-stone-900">
                          Room {room.room_number}
                        </div>
                        <div className="text-xs text-stone-500">{room.room_type} Suite</div>
                      </div>
                    </div>
                  </td>

                  {/* Rate */}
                  <td className="px-6 py-4 font-serif font-bold text-stone-900">
                    ${room.price_per_night} <span className="text-xs font-normal text-stone-500">/ night</span>
                  </td>

                  {/* Floor & Capacity */}
                  <td className="px-6 py-4 text-xs text-stone-600">
                    <div>Floor {room.floor || 1} • {room.bed_type || 'King Bed'}</div>
                    <div className="text-stone-500 font-medium">Up to {room.capacity} Guests</div>
                  </td>

                  {/* Room Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        room.room_status === 'available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : room.room_status === 'occupied'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      ● {room.room_status}
                    </span>
                  </td>

                  {/* Cleaning Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        room.cleaning_status === 'clean'
                          ? 'bg-emerald-100 text-emerald-800'
                          : room.cleaning_status === 'cleaning'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      ● {room.cleaning_status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(room)}
                        className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Room"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id, room.room_number)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {(isAddingNew || editingRoom) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-stone-200 shadow-2xl my-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-stone-200">
              <h3 className="font-serif text-2xl font-medium text-stone-900">
                {isAddingNew ? 'Add New Room to Inventory' : `Edit Room ${roomNumber}`}
              </h3>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingRoom(null);
                }}
                className="text-stone-400 hover:text-stone-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Executive">Executive</option>
                    <option value="Family">Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Nightly Price ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none font-serif font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Max Capacity (Guests)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Floor Level
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Bed Configuration
                  </label>
                  <input
                    type="text"
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    placeholder="e.g. 1 King or 2 Queen"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Room Occupancy Status
                  </label>
                  <select
                    value={roomStatus}
                    onChange={(e: any) => setRoomStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  >
                    <option value="available">Available (Ready for Booking)</option>
                    <option value="occupied">Occupied (Guest Stay Active)</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Cleaning Status
                  </label>
                  <select
                    value={cleaningStatus}
                    onChange={(e: any) => setCleaningStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  >
                    <option value="clean">Clean & Sanitized</option>
                    <option value="cleaning">Cleaning In Progress</option>
                    <option value="dirty">Dirty (Requires Housekeeping)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Amenities (Comma separated)
                </label>
                <input
                  type="text"
                  value={amenitiesInput}
                  onChange={(e) => setAmenitiesInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
