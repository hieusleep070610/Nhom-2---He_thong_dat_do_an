from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.role import Role
from app.models.user import User


ROLE_DEFINITIONS = (
    (1, "admin", "Quản trị toàn hệ thống"),
    (2, "kitchen", "Xử lý đơn hàng tại bếp"),
    (3, "customer", "Đặt món và quản lý đơn cá nhân"),
)


def seed_roles_and_assign_users(db: Session) -> None:
    roles_by_id = {role.id: role for role in db.query(Role).all()}
    for role_id, name, description in ROLE_DEFINITIONS:
        role = roles_by_id.get(role_id)
        if role is None:
            role = Role(id=role_id, name=name, description=description)
            db.add(role)
            roles_by_id[role_id] = role
        else:
            role.name = name
            role.description = description
    db.flush()

    admin_ids = settings.admin_user_ids
    kitchen_ids = settings.kitchen_user_ids
    for user in db.query(User).all():
        if user.user_id in admin_ids:
            user.roles = [roles_by_id[1]]
        elif user.user_id in kitchen_ids:
            user.roles = [roles_by_id[2]]
        elif not user.roles:
            user.roles = [roles_by_id[3]]
    db.commit()


def assign_customer_role(db: Session, user: User) -> None:
    role = db.get(Role, 3)
    if role is None:
        role = Role(id=3, name="customer", description="Đặt món và quản lý đơn cá nhân")
        db.add(role)
        db.flush()
    user.roles = [role]
