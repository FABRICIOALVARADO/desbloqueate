import { Component } from '@angular/core';

/** Componente de presentación puro: sin estado ni dependencias. Muestra marca y autoría. */
@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {}
