'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface EnvStatus {
  isValid: boolean;
  errors: string[];
}

export default function EnvChecker() {
  const [status, setStatus] = useState<EnvStatus | null>(null);
  const [isVisible, setIsVisible] = useState(process.env.NODE_ENV === 'development');

  useEffect(() => {
    // 只在開發環境顯示
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    fetch('/api/env-check')
      .then(res => res.json())
      .then((data) => {
        setStatus(data);
      })
      .catch(() => {
        // 如果API不存在，隱藏檢查器
        setIsVisible(false);
      });
  }, []);

  if (!isVisible || !status || status.isValid) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>环境配置检查</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            {status.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4 mr-1" />
            忽略
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}