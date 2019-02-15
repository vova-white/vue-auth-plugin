import { VueConstructor } from 'vue/types/vue';
import { Store } from 'vuex';
import { AuthUser, VueAuthOptions } from '@/interfaces/VueAuthOptions';
import { VueAuthStore } from '@/interfaces/VueAuthStore';

export class StoreVuex implements VueAuthStore {
  private readonly store: Store;
  private readonly module: string;

  constructor(private Vue: VueConstructor, private options: VueAuthOptions) {
    this.store = Vue.store as Store;
    this.module = this.options.vuexStoreSpace;
    this.createVueAuthStore();
  }

  getRoles(): string[] {
    return this.store.getters[`${this.module}/getRoles`];
  }

  getToken(): string {
    return this.store.getters[`${this.module}/getToken`];
  }

  getUser(): AuthUser {
    return this.store.getters[`${this.module}/getUser`];
  }

  setToken(token: string): void {
    this.store.dispatch(`${this.module}/setToken`, token);
  }

  setUser(user: AuthUser): void {
    this.store.dispatch(`${this.module}/setUser`, user);
  }

  private createVueAuthStore() {
    const module = {
      state: {
        token: null,
        user: null,
      },
      mutations: {
        SET_TOKEN(state, token: string) {
          state.token = token;
        },
        SET_USER(state, user) {
          state.user = user;
        },
      },
      actions: {
        setToken({ commit }, token) {
          commit('SET_TOKEN', token);
        },
        setUser({ commit }, user) {
          commit('SET_USER', user);
        },
      },
      getters: {
        getToken(state): string {
          return state.token;
        },
        getUser(state): AuthUser {
          return state.user;
        },
        getRoles(state): string[] {
          return state.user[this.options.rolesVar];
        },
      },
    };

    this.store.registerModule(this.module, module);
  }
}