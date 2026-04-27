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
    <section class="page-section page-section--tight" *ngIf="booking">
      <div class="page-container booking-journey">
        <div class="surface-panel surface-panel--feature flow-card">
          <div>
            <p class="eyebrow">Payment verification</p>
            <h1 class="section-title">Complete the downpayment and submit it for review.</h1>
            <p class="section-copy">
              The payment step now separates instructions, QR options, app actions, and verification
              feedback so the process is easier to follow.
            </p>
          </div>

          <div class="price-breakdown">
            <div class="price-row">
              <span class="text-muted">Booking reference</span>
              <strong>{{ booking.booking_ref }}</strong>
            </div>
            <div class="price-row" *ngIf="hotelName">
              <span class="text-muted">Hotel</span>
              <span>{{ hotelName }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Stay dates</span>
              <span>{{ formatDate(booking.check_in) }} to {{ formatDate(booking.check_out) }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Guests and nights</span>
              <span>{{ booking.guests }} guests · {{ booking.nights }} nights</span>
            </div>
          </div>

          <div class="feedback-banner feedback-banner--warning" *ngIf="verificationPending">
            {{ successMessage || 'Payment submitted. Verification is pending with admin.' }}
          </div>

          <div class="feedback-banner feedback-banner--info" *ngIf="verificationPending && hasAnySupportContact()">
            Need help?
            <span *ngIf="supportContacts.hotelAdminPhone"> Hotel: {{ supportContacts.hotelAdminPhone }}.</span>
            <span *ngIf="supportContacts.mainAdminPhone"> Helpline: {{ supportContacts.mainAdminPhone }}.</span>
          </div>

          <div *ngIf="!verificationPending" class="section-stack">
            <div class="price-breakdown">
              <div class="price-row">
                <span class="text-muted">Pay now</span>
                <strong>{{ booking.registration_amount | currencyInr }}</strong>
              </div>
              <div class="price-row">
                <span class="text-muted">Pay on arrival</span>
                <span>{{ booking.arrival_amount | currencyInr }}</span>
              </div>
              <div class="price-row">
                <span class="text-muted">Booking total</span>
                <strong>{{ booking.total_amount | currencyInr }}</strong>
              </div>
            </div>

            <div class="method-grid">
              <div class="payment-method">
                <div class="price-row">
                  <strong>Paytm</strong>
                  <span class="pill">QR</span>
                </div>
                <div class="payment-qr">
                  <img [src]="paytmQrPath" alt="Paytm QR Code" />
                </div>
                <div class="micro-copy">UPI ID: {{ upiIds.paytm || '-' }}</div>
                <button type="button" class="btn-secondary" (click)="openPaymentApp('paytm')" [disabled]="!deepLinks.paytm || loading" [class.btn-loading]="loading">
                  Open Paytm
                </button>
              </div>

              <div class="payment-method">
                <div class="price-row">
                  <strong>PhonePe</strong>
                  <span class="pill">QR</span>
                </div>
                <div class="payment-qr">
                  <img [src]="phonepeQrPath" alt="PhonePe QR Code" />
                </div>
                <div class="micro-copy">UPI ID: {{ upiIds.phonepe || '-' }}</div>
                <button type="button" class="btn-secondary" (click)="openPaymentApp('phonepe')" [disabled]="!deepLinks.phonepe || loading" [class.btn-loading]="loading">
                  Open PhonePe
                </button>
              </div>
            </div>

            <div class="field-stack">
              <label class="field-label">Transaction ID</label>
              <input type="text" placeholder="Optional transaction ID for faster verification" [(ngModel)]="transactionId" />
            </div>

            <div class="micro-copy">
              If the app link does not open, use the QR code or pay manually with the listed UPI ID.
            </div>

            <button class="btn-primary" (click)="confirmPayment()" [disabled]="loading" [class.btn-loading]="loading">
              I Have Completed Payment
            </button>
          </div>

          <div class="field-error" *ngIf="error">{{ error }}</div>

          <div *ngIf="showGeneratedCredentials" class="feedback-banner feedback-banner--success">
            Account created. Login ID: {{ generatedLoginId }}. Password: {{ generatedPassword }}.
          </div>
        </div>

        <aside class="surface-panel summary-card">
          <div>
            <p class="eyebrow">What happens next</p>
            <h2 class="section-title" style="font-size: 1.8rem;">A simple verification path after payment.</h2>
          </div>

          <div class="step-list">
            <div class="step-item">
              <span class="step-item__index">1</span>
              <div class="micro-copy">Pay the downpayment with QR or your preferred app.</div>
            </div>
            <div class="step-item">
              <span class="step-item__index">2</span>
              <div class="micro-copy">Submit the payment so admin can verify it.</div>
            </div>
            <div class="step-item">
              <span class="step-item__index">3</span>
              <div class="micro-copy">Keep the remaining balance ready for check-in day.</div>
            </div>
          </div>

          <div class="price-breakdown">
            <div class="price-row">
              <span class="text-muted">Downpayment</span>
              <strong>{{ booking.registration_amount | currencyInr }}</strong>
            </div>
            <div class="price-row">
              <span class="text-muted">Arrival balance</span>
              <span>{{ booking.arrival_amount | currencyInr }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Status</span>
              <span>{{ verificationPending ? 'Pending verification' : 'Awaiting payment submission' }}</span>
            </div>
          </div>
        </aside>
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
    const stateCredentials = typeof window !== 'undefined' ? window.history.state?.generatedCredentials : null;
    const storedCredentialsRaw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`generated_credentials_${this.bookingId}`) : null;

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
    const request = this.guestPhone ? this.bookingService.getGuestBooking(this.bookingId, this.guestPhone) : this.bookingService.getBooking(this.bookingId);

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
          paytm: (order.upiIds?.paytm || '').trim() || this.extractUpiId(order.deepLinks.paytm) || this.extractUpiId(order.upiLinks?.paytm),
          phonepe: (order.upiIds?.phonepe || '').trim() || this.extractUpiId(order.deepLinks.phonepe) || this.extractUpiId(order.upiLinks?.phonepe)
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

    const request = this.booking.property_type === 'room' ? this.roomService.getRoom(this.booking.property_id) : this.tentService.getTent(this.booking.property_id);

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
          this.successMessage = resp?.message || 'Payment submitted. Verification is pending with admin.';
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
