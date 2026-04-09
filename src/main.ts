import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { ErrorHandler } from '@angular/core';
import { GlobalErrorHandler } from './app/core/handlers/global-error.handler';
import { LoggerService } from './app/core/services/logger.service';
import { AuthInterceptor } from './app/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ animated: false }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ],
})
.then((appRef) => {
  const logger = appRef.injector.get(LoggerService);

  window.onerror = function (message, source, lineno, colno, error) {
    logger.error('window_error', {
      context: { message, source, lineno, colno }
    });
  };

  window.onunhandledrejection = function (event) {
    logger.error('unhandled_promise_rejection', {
      context: { reason: event.reason }
    });
  };

  logger.info('app_iniciada', {
    context: { timestamp: new Date().toISOString() }
  });
})
.catch(err => console.error(err));