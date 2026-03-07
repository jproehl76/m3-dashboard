import { useGoogleOneTapLogin, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import apexLabLogo from '@/assets/jp-apex-lab-logo.png';
import trackPhoto from '@/assets/track-background.jpg';
import { config } from '@/config';

interface GoogleJwt {
  email: string;
  name: string;
  picture: string;
}

interface LoginScreenProps {
  onAuth: (user: { email: string; name: string; picture: string }) => void;
}

function handleCredential(credential: string, onAuth: LoginScreenProps['onAuth']) {
  const decoded = jwtDecode<GoogleJwt>(credential);
  if (decoded.email !== config.ownerEmail) return;
  onAuth({ email: decoded.email, name: decoded.name, picture: decoded.picture });
}

export function LoginScreen({ onAuth }: LoginScreenProps) {
  // One Tap — auto-prompts if already signed into Google in the browser
  useGoogleOneTapLogin({
    onSuccess: (response) => {
      if (response.credential) handleCredential(response.credential, onAuth);
    },
    onError: () => {},
  });

  return (
    <div className="relative h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
      <img
        src={trackPhoto}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ objectPosition: 'center 40%', filter: 'brightness(0.55) saturate(0.8)', opacity: 0.50, zIndex: 0 }}
      />
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <img
          src={apexLabLogo}
          alt="JP Apex Lab"
          style={{ height: 160, width: 'auto' }}
        />
        <div className="text-center">
          <p className="text-slate-400 mt-1 text-sm">{config.carName}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-sm text-slate-400">Sign in to access your data</p>
          <GoogleLogin
            onSuccess={(response) => {
              if (response.credential) handleCredential(response.credential, onAuth);
            }}
            onError={() => {}}
            theme="filled_black"
            shape="rectangular"
            size="large"
            useOneTap={false}
          />
        </div>
      </div>
    </div>
  );
}
