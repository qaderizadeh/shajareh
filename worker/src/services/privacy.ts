import type { Env, FamilyRole, MembershipStatus, User } from "../env";
import { forbidden } from "../util/errors";

export type Membership = {
  familyId: string;
  role: FamilyRole;
  status: MembershipStatus;
};

export class PrivacyService {
  constructor(private env: Env) {}

  /** عضویت کاربر در یک خانواده */
  async getMembership(userId: string, familyId: string): Promise<Membership | null> {
    const row = await this.env.DB.prepare(
      "SELECT family_id, role, status FROM family_memberships WHERE family_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1"
    ).bind(familyId, userId).first<Record<string, unknown>>();
    if (!row) return null;
    return { familyId: row.family_id as string, role: row.role as FamilyRole, status: row.status as MembershipStatus };
  }

  canRead(user: User, membership: Membership | null): boolean {
    if (user.role === "ADMIN") return true;
    return membership !== null;
  }

  canWrite(user: User, membership: Membership | null): boolean {
    if (user.role === "ADMIN") return true;
    return membership !== null && membership.role !== "VIEWER";
  }

  /** نیاز به عضویت فعال برای خواندن */
  async requireRead(user: User, familyId: string): Promise<Membership> {
    const m = await this.getMembership(user.id, familyId);
    if (!this.canRead(user, m)) throw forbidden("شما عضو این خانواده نیستید", "NOT_IN_FAMILY");
    return m!;
  }

  /** نیاز به عضویت با حق ویرایش */
  async requireWrite(user: User, familyId: string): Promise<Membership> {
    const m = await this.getMembership(user.id, familyId);
    if (!this.canWrite(user, m)) throw forbidden("شما اجازهٔ ویرایش این اطلاعات را ندارید", "NO_WRITE");
    return m!;
  }
}