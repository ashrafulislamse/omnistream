import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import googleDriveService from '@/services/googleDrive';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleCallbackPage() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Handle the OAuth callback
        if (location.hash) {
            const success = googleDriveService.handleCallback(location.hash);

            if (success) {
                // Redirect to Drive page after successful auth
                setTimeout(() => {
                    navigate('/drive', { replace: true });
                }, 1500);
            } else {
                // Redirect to sources page on failure
                setTimeout(() => {
                    navigate('/sources', { replace: true });
                }, 2000);
            }
        } else {
            // No hash, redirect to sources
            navigate('/sources', { replace: true });
        }
    }, [location, navigate]);

    const isSuccess = location.hash && location.hash.includes('access_token');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a0a0f] dark:to-[#0c0c14] flex items-center justify-center p-6">
            <div className="text-center">
                {isSuccess ? (
                    <>
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-green-500/20 flex items-center justify-center animate-pulse">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Connected Successfully!</h2>
                        <p className="text-gray-500">Redirecting to your Drive...</p>
                    </>
                ) : location.hash ? (
                    <>
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
                        <p className="text-gray-500">Unable to connect to Google Drive. Redirecting...</p>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Processing...</h2>
                        <p className="text-gray-500">Connecting to Google Drive</p>
                    </>
                )}
            </div>
        </div>
    );
}
