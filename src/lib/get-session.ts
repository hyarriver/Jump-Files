/**
 * 获取当前用户Session的工具函数
 * 用于API路由中获取用户信息
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function getCurrentUser() {
  try {
    // 在 Next.js 16 App Router 中，getServerSession 需要传入 authOptions
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('未找到session或user');
      return null;
    }
    
    // 确保user有id属性
    const user = session.user as { id?: string; email?: string | null; name?: string | null };
    if (!user.id) {
      console.error('Session user missing id:', session.user);
      return null;
    }
    
    console.log('成功获取用户session:', { id: user.id, email: user.email });
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    console.error('获取用户session失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    return null;
  }
}
