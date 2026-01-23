// 文件传输调度器
export interface SchedulerTaskData {
  file: File;
  fileId: string;
  size: number;
}

interface QueuedTask {
  id: string;
  userId: string;
  data: SchedulerTaskData;
  run: () => Promise<void>;
  addedAt: number;
}

export class Scheduler {
  private static instance: Scheduler;
  private maxConcurrent = 9;
  private maxActiveUsers = 3;
  private pendingTasks: Map<string, QueuedTask[]> = new Map();
  private runningTasks: QueuedTask[] = [];

  private constructor() {}

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public addTask(
    userId: string,
    data: SchedulerTaskData,
    runFn: () => Promise<void>,
  ) {
    const task: QueuedTask = {
      id: data.fileId,
      userId,
      data,
      run: runFn,
      addedAt: Date.now(),
    };

    if (!this.pendingTasks.has(userId)) {
      this.pendingTasks.set(userId, []);
    }
    this.pendingTasks.get(userId)!.push(task);

    this.schedule();
  }

  private schedule() {
    const runningUserIds = new Set<string>();
    this.runningTasks.forEach((t) => runningUserIds.add(t.userId));
    
    const pendingUserIds = new Set<string>();
    this.pendingTasks.forEach((tasks, userId) => {
      if (tasks.length > 0) pendingUserIds.add(userId);
    });

    const activeUsers = new Set<string>(runningUserIds);

    if (activeUsers.size < this.maxActiveUsers) {
      const candidates = Array.from(pendingUserIds).filter(
        (uid) => !activeUsers.has(uid),
      );
      candidates.sort((a, b) => {
        const tasksA = this.pendingTasks.get(a) || [];
        const tasksB = this.pendingTasks.get(b) || [];
        const firstA = tasksA[0] ? tasksA[0].addedAt : Infinity;
        const firstB = tasksB[0] ? tasksB[0].addedAt : Infinity;
        return firstA - firstB;
      });
      const slots = this.maxActiveUsers - activeUsers.size;
      for (let i = 0; i < Math.min(slots, candidates.length); i++) {
        const candidate = candidates[i];
        if (candidate) {
          activeUsers.add(candidate);
        }
      }
    }
    if (activeUsers.size === 0) return;

    const userCount = activeUsers.size;
    const baseQuota = Math.floor(this.maxConcurrent / userCount);

    const userRunningCount = new Map<string, number>();
    activeUsers.forEach((u) => userRunningCount.set(u, 0));
    this.runningTasks.forEach((t) => {
      userRunningCount.set(t.userId, (userRunningCount.get(t.userId) || 0) + 1);
    });

    activeUsers.forEach((userId) => {
      const running = userRunningCount.get(userId) || 0;
      const availableQuota = baseQuota - running;
      if (availableQuota > 0) {
        this.launchUserTasks(userId, availableQuota);
      }
    });

    const totalRunning = this.runningTasks.length;
    let freeSlots = this.maxConcurrent - totalRunning;

    if (freeSlots > 0) {
      const allRemaining: QueuedTask[] = [];
      activeUsers.forEach((userId) => {
        const tasks = this.pendingTasks.get(userId);
        if (tasks) allRemaining.push(...tasks);
      });

      if (allRemaining.length > 0) {
        allRemaining.sort((a, b) => a.addedAt - b.addedAt);
        const toRun = allRemaining.slice(0, freeSlots);
        toRun.forEach((task) => {
          this.removeTaskFromPending(task);
          this.startTask(task);
        });
      }
    }
  }

  private launchUserTasks(userId: string, maxCount: number) {
    const tasks = this.pendingTasks.get(userId);
    if (!tasks || tasks.length === 0) return;

    let canLaunch = this.maxConcurrent - this.runningTasks.length;
    let limit = Math.min(maxCount, canLaunch);

    if (limit <= 0) return;
    tasks.sort((a, b) => a.data.size - b.data.size);

    const toRun = tasks.slice(0, limit);

    toRun.forEach((task) => {
      this.removeTaskFromPending(task);
      this.startTask(task);
    });
  }

  private removeTaskFromPending(task: QueuedTask) {
    const userTasks = this.pendingTasks.get(task.userId);
    if (userTasks) {
      const idx = userTasks.indexOf(task);
      if (idx !== -1) {
        userTasks.splice(idx, 1);
      }
    }
  }

  private startTask(task: QueuedTask) {
    this.runningTasks.push(task);

    task
      .run()
      .then(() => {
        // Success
      })
      .catch((err) => {
        console.error(`Task ${task.id} failed`, err);
      })
      .finally(() => {
        this.completeTask(task.id);
      });
  }

  private completeTask(taskId: string) {
    const idx = this.runningTasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      this.runningTasks.splice(idx, 1);
    }
    this.schedule();
  }
}

export const scheduler = Scheduler.getInstance();
