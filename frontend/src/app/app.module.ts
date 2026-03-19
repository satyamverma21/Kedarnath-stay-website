import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CurrencyInrPipe } from './shared/pipes/currency-inr.pipe';
import { PropertyCardComponent } from './shared/components/property-card/property-card.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';

// Page components
import { HomeComponent } from './pages/home/home.component';
import { RoomSearchComponent } from './pages/room-search/room-search.component';
import { TentSearchComponent } from './pages/tent-search/tent-search.component';
import { PropertyDetailComponent } from './pages/property-detail/property-detail.component';
import { BookingComponent } from './pages/booking/booking.component';
import { PaymentComponent } from './pages/payment/payment.component';
import { ReceiptComponent } from './pages/receipt/receipt.component';
import { MyBookingsComponent } from './pages/my-bookings/my-bookings.component';
import { EnquiryComponent } from './pages/enquiry/enquiry.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { AdminLayoutComponent } from './pages/admin/admin-layout/admin-layout.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { ManageRoomsComponent } from './pages/admin/manage-rooms/manage-rooms.component';
import { RoomFormComponent } from './pages/admin/room-form/room-form.component';
import { ManageTentsComponent } from './pages/admin/manage-tents/manage-tents.component';
import { TentFormComponent } from './pages/admin/tent-form/tent-form.component';
import { PriceSettingsComponent } from './pages/admin/price-settings/price-settings.component';
import { BookingsListComponent } from './pages/admin/bookings-list/bookings-list.component';
import { EnquiriesListComponent } from './pages/admin/enquiries-list/enquiries-list.component';
import { UserFormComponent } from './pages/admin/user-form/user-form.component';
import { ManageUsersComponent } from './pages/admin/manage-users/manage-users.component';
import { HotelFormComponent } from './pages/admin/hotel-form/hotel-form.component';
import { ManageHotelsComponent } from './pages/admin/manage-hotels/manage-hotels.component';
import { PromoCodeMasterComponent } from './pages/admin/promo-code-master/promo-code-master.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    PropertyCardComponent,
        LoadingSpinnerComponent,

    CurrencyInrPipe,
    HomeComponent,
    RoomSearchComponent,
    TentSearchComponent,
    PropertyDetailComponent,
    BookingComponent,
    PaymentComponent,
    ReceiptComponent,
    MyBookingsComponent,
    EnquiryComponent,PromoCodeMasterComponent,
    LoginComponent,
    RegisterComponent,
    AdminLayoutComponent,
    DashboardComponent,
    ManageRoomsComponent,
    RoomFormComponent,
    ManageTentsComponent,
    TentFormComponent,
    PriceSettingsComponent,
    BookingsListComponent,
    EnquiriesListComponent,
    ManageHotelsComponent,
    HotelFormComponent,
    ManageUsersComponent,
    UserFormComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
