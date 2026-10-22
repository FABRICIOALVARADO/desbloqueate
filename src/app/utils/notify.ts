import Swal, { SweetAlertIcon } from 'sweetalert2';

/** Notificación emergente breve (SweetAlert2 en modo "toast"), sin bloquear al usuario. */
export function toast(icon: SweetAlertIcon, title: string): void {
  void Swal.fire({
    toast: true, position: 'bottom-end', icon, title,
    showConfirmButton: false, timer: 2000, timerProgressBar: true,
  });
}
