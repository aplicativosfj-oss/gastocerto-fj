import { EmblemBike, EmblemCar } from "@/components/ui/panel-emblems";

/** Tipos de veículo que devem usar o emblema de duas rodas. */
const TWO_WHEELS = new Set(["motorcycle", "moto", "bike", "bicicleta", "scooter"]);

export function isTwoWheeler(vehicleType?: string | null): boolean {
  if (!vehicleType) return false;
  return TWO_WHEELS.has(vehicleType.toLowerCase());
}

/**
 * Emblema SVG do veículo: moto ganha o emblema de duas rodas,
 * qualquer outro tipo (carro, caminhão, van) usa o emblema de carro.
 */
export function VehicleEmblem({
  vehicleType,
  className,
}: {
  vehicleType?: string | null;
  className?: string;
}) {
  return isTwoWheeler(vehicleType) ? (
    <EmblemBike title="Moto" className={className} />
  ) : (
    <EmblemCar title="Carro" className={className} />
  );
}
