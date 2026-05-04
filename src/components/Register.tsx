import React, { useState, useRef } from 'react';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Calendar, 
  Phone, 
  Briefcase, 
  Camera, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle 
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { CropModal } from './CropModal';
import { motion, AnimatePresence } from 'motion/react';

interface RegisterProps {
  onLoginClick: () => void;
  onSuccess?: () => void;
}

type Step = 'credentials' | 'info' | 'photo';

export const Register: React.FC<RegisterProps> = ({ onLoginClick, onSuccess }) => {
  const [step, setStep] = useState<Step>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Registration Data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    birthday: '',
    role: '',
    phoneNumber: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Photo Handling
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roles = ['Lider', 'Treinador', 'Discipulador', 'Membro'];

  const validateCredentials = () => {
    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return false;
    }
    return true;
  };

  const validateInfo = () => {
    if (!formData.name || !formData.birthday || !formData.role || !formData.phoneNumber) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (step === 'credentials') {
      if (validateCredentials()) setStep('info');
    } else if (step === 'info') {
      if (validateInfo()) setStep('photo');
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'info') setStep('credentials');
    else if (step === 'photo') setStep('info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempPhoto(reader.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setPhoto(croppedImage);
    setIsCropModalOpen(false);
    setTempPhoto(null);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Auth Profile (only name, photo is kept in Firestore due to size limits)
      await updateProfile(user, {
        displayName: formData.name
      });

      // 3. Create Firestore Profile (Source of truth for all data including photo)
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        birthday: formData.birthday,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        photoURL: photo || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Send Verification Email
      await sendEmailVerification(user);

      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O cadastro por e-mail não está ativado no Console do Firebase.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 underline decoration-indigo-500 decoration-4">Crie sua conta</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Entre para o nosso time!</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className={`h-1.5 flex-1 rounded-full ${step === 'credentials' ? 'bg-indigo-600' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
        <div className={`h-1.5 flex-1 rounded-full ${step === 'info' ? 'bg-indigo-600' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
        <div className={`h-1.5 flex-1 rounded-full ${step === 'photo' ? 'bg-indigo-600' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {step === 'credentials' && (
          <motion.div 
            key="credentials"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-12 pr-12 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Confirmar Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full pl-12 pr-12 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              onClick={handleNext}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              Próximo
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 'info' && (
          <motion.div 
            key="info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nascimento</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Celular</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Função</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({...formData, role})}
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                      formData.role === role 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={handleBack}
                className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Voltar
              </button>
              <button 
                onClick={handleNext}
                className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                Próximo
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'photo' && (
          <motion.div 
            key="photo"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="w-40 h-40 rounded-full border-4 border-indigo-500 overflow-hidden bg-zinc-100 dark:bg-zinc-800 group-hover:opacity-90 transition-opacity">
                  {photo ? (
                    <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <User className="w-20 h-20" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera className="w-6 h-6" />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-zinc-900 dark:text-white">Foto de Perfil</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Opcional para a criação</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleBack}
                disabled={loading}
                className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Voltar
              </button>
              <button 
                onClick={handleRegister}
                disabled={loading}
                className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Finalizar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10 text-center text-sm font-medium">
        <span className="text-zinc-500 dark:text-zinc-400">Já tem uma conta? </span>
        <button 
          onClick={onLoginClick}
          className="text-indigo-600 hover:text-indigo-500 transition-colors font-bold"
        >
          Faça login
        </button>
      </div>

      <AnimatePresence>
        {isCropModalOpen && tempPhoto && (
          <CropModal 
            image={tempPhoto}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setIsCropModalOpen(false);
              setTempPhoto(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
