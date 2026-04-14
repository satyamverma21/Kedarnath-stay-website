import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="bg-dark text-cream mt-auto">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 text-sm">
          <div class="font-heading text-lg text-cream">Kedar-Stays</div>
          <div class="flex flex-wrap gap-6">
            <a routerLink="/rooms" class="text-cream/80 hover:text-cream transition-colors">Rooms</a>
            <a routerLink="/tents" class="text-cream/80 hover:text-cream transition-colors">Tents</a>
            <a routerLink="/enquiry" class="text-cream/80 hover:text-cream transition-colors">Enquiry</a>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:justify-between gap-4 text-cream/70 text-sm">
          <p>&copy; {{ year }} Kedar-Stays. All rights reserved.</p>
          <p>Crafted with care for beautiful stays in the wild.</p>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  year = new Date().getFullYear();
}

