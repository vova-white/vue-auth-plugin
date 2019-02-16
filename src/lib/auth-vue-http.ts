import { AxiosInstance } from 'axios';
import { VueAuthOptions } from '../interfaces/VueAuthOptions';
import { VueAuthLogin } from '../interfaces/VueAuthLogin';
import AuthStoreManager from './auth-vue-store-manager';
import AuthVueRouter from './auth-vue-router';

export default class AuthVueHttp {
  private http: AxiosInstance;
  private interval: any;

  constructor(
    private Vue: any,
    private options: VueAuthOptions,
    private storeManager: AuthStoreManager,
    private router: AuthVueRouter) {
    if (!this.Vue.axios) {
      throw Error('vue-axios is a required dependency');
    }
    this.http = Vue.axios as AxiosInstance;
    this.configureHttp();
    this.startRefresh();
  }

  logout() {
    const { url, method, redirect, makeRequest } = this.options.logoutData;
    if (makeRequest) {
      this.http({
        method,
        url,
        headers: { ...this.getAuthHeader() },
      });
    }
    this.storeManager.resetAll();
    if (redirect) {
      this.router.push(redirect);
    }
  }

  fetchData(force: boolean = false) {
    const { enabled, method, url } = this.options.fetchData;
    if (enabled || force) {
      const promise = this.http({
        method,
        url,
        headers: { ...this.getAuthHeader() },
      });
      promise
        .then(({ data }) => {
          this.storeManager.setUser(data.user || data);
        })
        .catch((error) => {
          console.error('FETCHDATA ERROR!', error);
        });
      return promise;
    }
    return Promise.reject(null);
  }

  login(loginInfo: VueAuthLogin) {
    const { method, url, redirect, fetchUser } = this.options.loginData;
    return this.http({
      method,
      url,
      data: loginInfo,
    })
      .then(async (response) => {
        const { headers } = response;
        this.extractToken(headers);
        this.startRefresh();
        if (fetchUser) {
          await this.fetchData(true);
        }
        if (redirect) {
          this.router.push(redirect);
        }
      })
      .catch((error) => {
        console.error('LOGIN error', error);
      });
  }

  private configureHttp() {
    this.http.interceptors.request.use((request) => {
      console.log('INTERCEPT REQUEST', request);
      if (request.headers) {
        Object.keys(request.headers)
          .forEach((head) => {
            const value: string = request.headers[head];
            if (value && typeof value === 'string' && value.includes(this.options.headerTokenReplace)) {
              request.headers[head] = value.replace(this.options.headerTokenReplace, this.storeManager.getToken());
            }
          });
      }
      return request;
    }, (error) => {
      console.log('INTERCEPT REQUEST ERROR!', error);
      return Promise.reject(error);
    });
    this.http.interceptors.response.use((response) => {
      console.log('INTERCEPT RESPONSE', response);
      return response;
    }, (error) => {
      console.log('INTERCEPT RESPONSE ERROR!', error);
      const status = error && error.response && error.response.status;
      if (status === 401) {
        this.logout();
      }
      return Promise.reject(error);
    });
  }

  private startRefresh() {
    const { interval } = this.options.fetchData;
    if (!this.interval) {
      this.interval = setInterval(() => {
        this.fetchData();
      }, interval * 60 * 1000);
    }
  }

  private extractToken(headers: { [head: string]: string }) {
    const { headerToken } = this.options.loginData;
    const head = (headers[headerToken.toLowerCase()] || '').split(' ');
    const token = head[1] || head[0];
    this.storeManager.setToken(token.trim());
  }

  private getAuthHeader() {
    const { headerToken } = this.options.loginData;
    const { tokenType, headerTokenReplace } = this.options;

    const token = `${tokenType} ${headerTokenReplace}`.trim();
    return { [headerToken]: token };
  }
}