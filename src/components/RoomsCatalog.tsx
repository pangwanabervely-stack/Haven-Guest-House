import React from 'react';
import {
  Users,
  BedDouble,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Room } from '../types';
import { ImageWithFallback } from './ui/ImageWithFallback';

interface RoomsCatalogProps {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
  onBookRoomDirect: (room: Room) => void;
}

export const RoomsCatalog: React.FC<RoomsCatalogProps> = ({
  rooms,
  onSelectRoom,
  onBookRoomDirect
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E2D9] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D] mb-2">
            Sanctuary Accommodations
          </div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-medium">
            Chambers & Heritage Suites
          </h1>
          <p className="text-[#8C887D] text-xs mt-2 max-w-2xl leading-relaxed">
            Each room at The Haven has been individually crafted with natural wood, plush organic bedding, and serene views of the gardens or coastal hills in Gweru, Zimbabwe.
          </p>
        </div>

        <div className="text-xs text-[#8C887D] bg-white px-4 py-2 rounded-full border border-[#E5E2D9] self-start sm:self-auto">
          <span>
            Showing <strong className="text-[#2C2C2C]">{rooms.length}</strong> distinctive accommodations
          </span>
        </div>
      </div>

      {/* Rooms Grid */}
      {rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E5E2D9]">
          <BedDouble className="w-10 h-10 text-[#8C887D] mx-auto mb-3" />
          <h3 className="font-serif italic text-lg text-[#2C2C2C] font-medium">Accommodations Loading</h3>
          <p className="text-xs text-[#8C887D] max-w-sm mx-auto mt-1">
            Loading heritage suites and garden chambers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#E5E2D9] shadow-xs hover:shadow-sm hover:border-[#5A5A40] transition-all flex flex-col group"
            >
              {/* Photo & Top Tags */}
              <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F2ED]">
                <ImageWithFallback
                  src={room.image_url}
                  alt={room.name || room.room_type}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                <div className="absolute top-3 left-3 bg-[#2C2C2C]/85 backdrop-blur-md text-[#E5D7C7] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
                  Room {room.room_number} &bull; {room.room_type}
                </div>

                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-[#2C2C2C] px-3.5 py-1 rounded-full text-xs font-bold shadow-xs border border-[#E5E2D9]">
                  ${room.price_per_night} <span className="text-[10px] font-normal text-[#8C887D]">/ night</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-3 text-xs text-[#8C887D] mb-2">
                    <span className="flex items-center gap-1 font-medium text-[#2C2C2C]">
                      <Users className="w-3.5 h-3.5 text-[#8C887D]" />
                      Up to {room.capacity} Guests
                    </span>
                    <span>&bull;</span>
                    <span>Floor {room.floor || 1}</span>
                    <span>&bull;</span>
                    <span>{room.bed_type || 'King Bed'}</span>
                  </div>

                  <p className="text-xs text-[#2C2C2C]/80 line-clamp-2 leading-relaxed mb-4">
                    {room.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(room.amenities) ? room.amenities : []).slice(0, 3).map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9]"
                      >
                        {amenity}
                      </span>
                    ))}
                    {(Array.isArray(room.amenities) ? room.amenities : []).length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F2ED] text-[#8C887D]">
                        +{(Array.isArray(room.amenities) ? room.amenities : []).length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-[#F5F2ED] flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectRoom(room)}
                    className="text-xs font-bold text-[#5A5A40] hover:text-[#2C2C2C] underline underline-offset-4"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => onBookRoomDirect(room)}
                    className="px-4 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <span>Reserve</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
