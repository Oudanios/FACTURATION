/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { USER_ACCOUNTS } from '../data';
import { UserAccount } from '../types';
import { KeyRound, Shield, Eye, EyeOff, Hotel, Check, Languages } from 'lucide-react';
import { motion } from 'motion/react';

import { Lang } from '../translations';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}


const TRANSLATIONS = {
  es: {
    demoModeTitle: "💡 Modo de Demostración:",
    demoModeText: "Haz clic en cualquier cuenta preestablecida abajo para rellenar automáticamente las credenciales de entrada.",
    title: "Hostal Serramar",
    subtitle: "Inicie sesión para gestionar entradas, saldos diarios y reportes financieros",
    errorMsg: "Usuario o contraseña incorrectos. Por favor, revise las credenciales.",
    username: "Usuario",
    password: "Contraseña",
    placeholderUser: "ej. admin",
    placeholderPass: "••••••••",
    loginBtn: "Iniciar Sesión",
    authorizedTitle: "Cuentas Autorizadas (Haz Clic Para Entrar)",
    languageLabel: "Idioma / Language",
  },
  en: {
    demoModeTitle: "💡 Demo Mode:",
    demoModeText: "Click on any authorized account below to automatically fill credentials and log in.",
    title: "Hostal Serramar",
    subtitle: "Log in to manage entries, daily balances and financial reports",
    errorMsg: "Incorrect username or password. Please check your credentials.",
    username: "Username",
    password: "Password",
    placeholderUser: "e.g. admin",
    placeholderPass: "••••••••",
    loginBtn: "Sign In",
    authorizedTitle: "Authorized Accounts (Click to Auto-fill)",
    languageLabel: "Language / Idioma",
  },
  fr: {
    demoModeTitle: "💡 Mode Démo:",
    demoModeText: "Cliquez sur l'un des comptes autorisés ci-dessous pour préremplir les informations et vous connecter.",
    title: "Hostal Serramar",
    subtitle: "Connectez-vous pour gérer les entrées, soldes et rapports financiers",
    errorMsg: "Identifiant ou mot de passe incorrect. Veuillez vérifier vos identifiants.",
    username: "Utilisateur",
    password: "Mot de passe",
    placeholderUser: "ex. admin",
    placeholderPass: "••••••••",
    loginBtn: "Se Connecter",
    authorizedTitle: "Comptes Autorisés (Cliquez pour Pré-remplir)",
    languageLabel: "Langue / Idioma",
  }
};

export default function LoginScreen({ onLoginSuccess, lang, onLangChange }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = TRANSLATIONS[lang];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const account = USER_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (account && account.password === password) {
      onLoginSuccess(account);
      setErrorMsg('');
    } else {
      setErrorMsg(t.errorMsg);
    }
  };

  const selectPredefinedAccount = (acc: UserAccount) => {
    setUsername(acc.username);
    setPassword(acc.password || '');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg text-xs leading-5 border border-slate-200 shadow-sm max-w-sm">
        <span className="font-semibold text-slate-800 block mb-1">{t.demoModeTitle}</span>
        <p className="text-slate-600 leading-normal">{t.demoModeText}</p>
      </div>

      <div className="sm:mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            <Hotel className="w-10 h-10" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900">
          {t.title}
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500 font-medium">
          {t.subtitle}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Language selector band */}
        <div className="flex justify-center mb-4 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300/30 max-w-[280px] mx-auto">
          <button
            type="button"
            onClick={() => onLangChange('es')}
            className={`flex-1 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              lang === 'es' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🇪🇸 SP
          </button>
          <button
            type="button"
            onClick={() => onLangChange('en')}
            className={`flex-1 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🇺🇸 EN
          </button>
          <button
            type="button"
            onClick={() => onLangChange('fr')}
            className={`flex-1 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              lang === 'fr' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🇫🇷 FR
          </button>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl border border-slate-200/50 rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t.username}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 placeholder-slate-400 text-xs font-bold transition-all"
                  placeholder={t.placeholderUser}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t.password}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 placeholder-slate-400 text-xs font-mono transition-all pr-12"
                  placeholder={t.placeholderPass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full h-11 flex justify-center items-center px-4 border border-transparent rounded-xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md shadow-indigo-500/10 cursor-pointer transition-all active:scale-[0.98]"
              >
                {t.loginBtn}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <span className="block text-[10px] font-bold text-center uppercase tracking-wider text-slate-400 mb-4 font-sans">
              {t.authorizedTitle}
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {USER_ACCOUNTS.map((acc) => {
                const isSelected = username.toLowerCase() === acc.username.toLowerCase();
                let roleColor = "";
                let roleLabel = "";
                if (acc.role === 'ADMIN') {
                  roleColor = "bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100/50";
                  roleLabel = "ADMIN";
                } else if (acc.role === 'MANAGER') {
                  roleColor = "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100/50";
                  roleLabel = "MGR";
                } else if (acc.role === 'USER') {
                  roleColor = "bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100/50";
                  roleLabel = "USER";
                } else {
                  roleColor = "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/50";
                  roleLabel = "VIEW";
                }

                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => selectPredefinedAccount(acc)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-slate-800 block truncate max-w-[80px]">{acc.name.split(' ')[0]}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wide border ${roleColor}`}>{roleLabel}</span>
                    </div>
                    <div className="mt-1 flex items-center text-[10px] text-slate-500 justify-between w-full">
                      <span className="font-mono bg-white px-1 leading-normal rounded border border-slate-200/80">{acc.password}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
