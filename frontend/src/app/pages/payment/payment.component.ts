import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookingService, Booking } from '../../core/services/booking.service';
import { PaymentService, SupportContacts } from '../../core/services/payment.service';
import { RoomService } from '../../core/services/room.service';
import { TentService } from '../../core/services/tent.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-payment',
  template: `
    <section class="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10" *ngIf="booking">
      <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-6">Payment</h1>
      <div class="card p-5 sm:p-6 space-y-4 text-sm">
        <div>
          <div class="font-semibold text-dark">Booking {{ booking.booking_ref }}</div>
          <div class="text-muted mt-1" *ngIf="hotelName">
            Hotel: {{ hotelName }}
          </div>
          <div class="text-muted mt-1">
            {{ formatDate(booking.check_in) }} to {{ formatDate(booking.check_out) }} |
            {{ booking.nights }} nights | {{ booking.guests }} guests
          </div>
        </div>
        <div class="border-t border-sand pt-4 space-y-2">
          <div class="flex justify-between">
            <span class="text-muted">Registration Fee (Pay Now)</span>
            <span>{{ booking.registration_amount | currencyInr }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Balance Due on Arrival</span>
            <span>{{ booking.arrival_amount | currencyInr }} (Pay in cash at hotel check-in)</span>
          </div>
          <div class="text-xs text-muted">
            Registration fee is non-refundable.
          </div>
          <div class="flex justify-between font-semibold text-earth text-base pt-2">
            <span>Total Booking Amount</span>
            <span>{{ booking.total_amount | currencyInr }}</span>
          </div>
        </div>
        <div class="pt-2">
          <div *ngIf="verificationPending" class="rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
            {{ successMessage || 'Payment submitted. Verification is pending with admin.' }}
          </div>
          <div
            *ngIf="verificationPending && hasAnySupportContact()"
            class="mt-3 rounded-md border border-sky-300 bg-sky-50 text-sky-900 px-3 py-3 text-sm space-y-2"
          >
            <div class="font-semibold">Need help?</div>
            <div *ngIf="supportContacts.hotelAdminPhone">
              Hotel contact number:
              <a class="font-semibold underline" [href]="'tel:' + supportContacts.hotelAdminPhone">
                {{ supportContacts.hotelAdminPhone }}
              </a>
            </div>
            <div *ngIf="supportContacts.mainAdminPhone">
              Kedar-stays helpline number:
              <a class="font-semibold underline" [href]="'tel:' + supportContacts.mainAdminPhone">
                {{ supportContacts.mainAdminPhone }}
              </a>
            </div>
          </div>

          <div *ngIf="!verificationPending && isDesktop; else mobilePayment" class="space-y-4">
            <div class="text-sm text-muted">
              Scan QR from your phone UPI app and complete payment for
              <span class="font-semibold text-dark">{{ booking.registration_amount | currencyInr }}</span>.
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="border border-sand rounded-lg p-3">
                <div class="font-semibold text-dark mb-2">Paytm</div>
                <img
                  [src]="paytmQrPath"
                  alt="Paytm QR Code"
                  class="w-full max-w-[220px] mx-auto rounded-md border border-sand"
                />
                <div class="mt-2 text-xs text-muted break-all">UPI ID: {{ upiIds.paytm || '-' }}</div>
              </div>
              <div class="border border-sand rounded-lg p-3">
                <div class="font-semibold text-dark mb-2">PhonePe</div>
                <img
                  [src]="phonepeQrPath"
                  alt="PhonePe QR Code"
                  class="w-full max-w-[220px] mx-auto rounded-md border border-sand"
                />
                <div class="mt-2 text-xs text-muted break-all">UPI ID: {{ upiIds.phonepe || '-' }}</div>
              </div>
            </div>
          </div>
          <ng-template #mobilePayment>
            <div class="space-y-4" *ngIf="!verificationPending">
              <div class="text-sm text-muted">
                Scan QR from another device, or use app buttons below to complete payment for
                <span class="font-semibold text-dark">{{ booking.registration_amount | currencyInr }}</span>.
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="border border-sand rounded-lg p-3">
                  <div class="font-semibold text-dark mb-2">Paytm</div>
                  <img
                    [src]="paytmQrPath"
                    alt="Paytm QR Code"
                    class="w-full max-w-[220px] mx-auto rounded-md border border-sand"
                  />
                  <div class="mt-2 text-xs text-muted break-all">UPI ID: {{ upiIds.paytm || '-' }}</div>
                </div>
                <div class="border border-sand rounded-lg p-3">
                  <div class="font-semibold text-dark mb-2">PhonePe</div>
                  <img
                    [src]="phonepeQrPath"
                    alt="PhonePe QR Code"
                    class="w-full max-w-[220px] mx-auto rounded-md border border-sand"
                  />
                  <div class="mt-2 text-xs text-muted break-all">UPI ID: {{ upiIds.phonepe || '-' }}</div>
                </div>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 mt-3" *ngIf="!verificationPending">
              <button
                type="button"
                class="btn-primary text-center"
                (click)="openPaymentApp('paytm')"
                [disabled]="!deepLinks.paytm || loading"
                [class.btn-loading]="loading"
              >
                Pay with Paytm ({{ booking.registration_amount | currencyInr }})
              </button>
              <button
                type="button"
                class="btn-secondary text-center"
                (click)="openPaymentApp('phonepe')"
                [disabled]="!deepLinks.phonepe || loading"
                [class.btn-loading]="loading"
              >
                Pay with PhonePe ({{ booking.registration_amount | currencyInr }})
              </button>
            </div>
          </ng-template>

          <div class="mt-3" *ngIf="!verificationPending">
            <button class="btn-primary w-full" (click)="confirmPayment()" [disabled]="loading" [class.btn-loading]="loading">
              I Have Completed Payment ({{ booking.registration_amount | currencyInr }})
            </button>
          </div>
          <div class="text-xs text-muted mt-2">
            If app link does not open, copy UPI ID and pay manually:
            {{ upiIds.paytm }} / {{ upiIds.phonepe }}
          </div>
          <div class="mt-2 space-y-2">
            <input
              type="text"
              class="w-full border border-sand rounded-md px-3 py-2"
              placeholder="Transaction ID (optional)"
              [(ngModel)]="transactionId"
            />
          </div>
          <div class="text-xs text-red-600 mt-2" *ngIf="error">{{ error }}</div>

          <div *ngIf="showGeneratedCredentials" class="mt-5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm">
          <div class="font-semibold text-emerald-900">Your account has been created</div>
          <div class="text-emerald-900 mt-1">Login ID (Phone): <span class="font-semibold">{{ generatedLoginId }}</span></div>
          <div class="text-emerald-900 mt-1">Password: <span class="font-semibold">{{ generatedPassword }}</span></div>
          <div class="text-emerald-900 mt-1"><span class="font-semibold">You are successfully logged in.</span></div>
          <div class="text-emerald-900 mt-1"><span class="font-semibold" style="color:red">If your payment fails, then click on my bookings menu.</span></div>
          </div>
        </div>
      </div>
    </section>
    <app-loading-spinner [show]="loading || !booking"></app-loading-spinner>
  `
})
export class PaymentComponent {
  bookingId!: number;
  booking: Booking | null = null;
  hotelName = '';
  loading = false;
  error = '';
  guestPhone = '';
  transactionId = '';
  successMessage = '';
  deepLinks: { paytm: string; phonepe: string } = { paytm: '', phonepe: '' };
  upiLinks: { paytm: string; phonepe: string } = { paytm: '', phonepe: '' };
  upiIds: { paytm: string; phonepe: string } = { paytm: '', phonepe: '' };
  verificationPending = false;
  isDesktop = true;
  generatedLoginId = '';
  generatedPassword = '';
  showGeneratedCredentials = false;
  supportContacts: SupportContacts = { hotelAdminPhone: '', mainAdminPhone: '' };
  paytmQrPath = 'assets/payments/paytm-qr.png';
  phonepeQrPath = 'assets/payments/phonepe-qr.png';
  selectedMethod: 'paytm' | 'phonepe' | 'upi' = 'upi';
  private routeParamsReady = false;
  private queryParamsReady = false;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private paymentService: PaymentService,
    private roomService: RoomService,
    private tentService: TentService,
    private toast: ToastService
  ) {
    this.isDesktop = this.detectDesktop();
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('bookingId');
      if (idParam) {
        this.bookingId = Number(idParam);
      }
      this.routeParamsReady = true;
      this.tryLoadBooking();
    });
    this.route.queryParamMap.subscribe((params) => {
      this.guestPhone = (params.get('phone') || '').trim();
      this.queryParamsReady = true;
      this.tryLoadBooking();
    });
  }

  private tryLoadBooking(): void {
    if (!this.routeParamsReady || !this.queryParamsReady || !this.bookingId) {
      return;
    }
    this.resolveGeneratedCredentials();
    this.loadBooking();
  }

  private resolveGeneratedCredentials(): void {
    const stateCredentials =
      typeof window !== 'undefined' ? window.history.state?.generatedCredentials : null;
    const storedCredentialsRaw =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(`generated_credentials_${this.bookingId}`)
        : null;

    let storedCredentials: { loginId?: string; password?: string } | null = null;
    if (storedCredentialsRaw) {
      try {
        storedCredentials = JSON.parse(storedCredentialsRaw);
      } catch {
        storedCredentials = null;
      }
    }

    const loginId = (stateCredentials?.loginId || storedCredentials?.loginId || '').trim();
    const password = (stateCredentials?.password || storedCredentials?.password || '').trim();

    this.generatedLoginId = loginId;
    this.generatedPassword = password;
    this.showGeneratedCredentials = !!(loginId && password);
  }

  private loadBooking(): void {
    this.loading = true;
    const request = this.guestPhone
      ? this.bookingService.getGuestBooking(this.bookingId, this.guestPhone)
      : this.bookingService.getBooking(this.bookingId);

    request.subscribe({
      next: (booking) => {
        this.booking = booking;
        this.loadHotelName();
        this.preparePaymentLinks();
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load booking details.';
      }
    });
  }

  private preparePaymentLinks(): void {
    if (!this.booking) {
      this.loading = false;
      return;
    }

    this.error = '';
    this.successMessage = '';

    if (this.booking.payment_status === 'pending_verification') {
      this.verificationPending = true;
      this.loading = false;
      this.successMessage = 'Payment already submitted. Admin verification is pending.';
      this.loadSupportContacts();
      return;
    }
    this.verificationPending = false;

    this.paymentService.createOrder(this.bookingId, this.guestPhone || undefined).subscribe({
      next: (order) => {
        this.deepLinks = order.deepLinks;
        this.upiLinks = order.upiLinks || { paytm: '', phonepe: '' };
        this.upiIds = {
          paytm:
            (order.upiIds?.paytm || '').trim() ||
            this.extractUpiId(order.deepLinks.paytm) ||
            this.extractUpiId(order.upiLinks?.paytm),
          phonepe:
            (order.upiIds?.phonepe || '').trim() ||
            this.extractUpiId(order.deepLinks.phonepe) ||
            this.extractUpiId(order.upiLinks?.phonepe)
        };
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to generate payment links.';
      }
    });
  }

  private loadHotelName(): void {
    if (!this.booking) {
      this.hotelName = '';
      return;
    }

    const request =
      this.booking.property_type === 'room'
        ? this.roomService.getRoom(this.booking.property_id)
        : this.tentService.getTent(this.booking.property_id);

    request.subscribe({
      next: (property) => {
        this.hotelName = (property.hotel_name || '').trim();
      },
      error: () => {
        this.hotelName = '';
      }
    });
  }

  setSelectedMethod(method: 'paytm' | 'phonepe'): void {
    this.selectedMethod = method;
  }

  openPaymentApp(method: 'paytm' | 'phonepe'): void {
    this.setSelectedMethod(method);
    const deepLink = this.deepLinks[method];
    const upiLink = method === 'paytm' ? '' : this.upiLinks.phonepe;
    if (!deepLink) {
      return;
    }

    if (method === 'phonepe') {
      window.location.href = deepLink;
      setTimeout(() => {
        if (upiLink) {
          window.location.href = upiLink;
        }
      }, 900);
      return;
    }

    window.location.href = deepLink;
  }

  confirmPayment(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.paymentService
      .verifyPayment({
        bookingId: this.bookingId,
        method: this.selectedMethod,
        transactionId: this.transactionId.trim() || undefined,
        phone: this.guestPhone || undefined
      })
      .subscribe({
        next: (resp) => {
          this.loading = false;
          if (resp?.booking) {
            this.booking = resp.booking;
          }
          if (resp?.supportContacts) {
            this.supportContacts = {
              hotelAdminPhone: (resp.supportContacts.hotelAdminPhone || '').trim(),
              mainAdminPhone: (resp.supportContacts.mainAdminPhone || '').trim()
            };
          }
          this.verificationPending = true;
          this.successMessage =
            resp?.message || 'Payment submitted. Verification is pending with admin.';
          this.toast.success(this.successMessage);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Unable to submit payment for verification.';
          this.toast.error(this.error);
        }
      });
  }

  hasAnySupportContact(): boolean {
    return !!(this.supportContacts.hotelAdminPhone || this.supportContacts.mainAdminPhone);
  }

  private loadSupportContacts(): void {
    this.paymentService.getPaymentByBooking(this.bookingId, this.guestPhone || undefined).subscribe({
      next: (resp) => {
        this.supportContacts = {
          hotelAdminPhone: (resp?.supportContacts?.hotelAdminPhone || '').trim(),
          mainAdminPhone: (resp?.supportContacts?.mainAdminPhone || '').trim()
        };
      },
      error: () => {
        this.supportContacts = { hotelAdminPhone: '', mainAdminPhone: '' };
      }
    });
  }

  private extractUpiId(link?: string): string {
    if (!link) {
      return '';
    }
    const match = link.match(/[?&]pa=([^&]+)/i);
    return match ? decodeURIComponent(match[1]) : '';
  }

  private detectDesktop(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return true;
    }
    const ua = navigator.userAgent || '';
    const isMobileUa = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua);
    const smallScreen = window.innerWidth < 992;
    return !isMobileUa && !smallScreen;
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  }
}
