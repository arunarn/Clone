// Copyright 2020 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { LocalizerType } from './types/Util';
import type { ReplacementValuesType } from './types/I18N';
import type { UUIDStringType } from './types/UUID';
import { missingCaseError } from './util/missingCaseError';

import type { GroupV2ChangeDetailType, GroupV2ChangeType } from './groups';
import { SignalService as Proto } from './protobuf';
import * as log from './logging/log';

export type SmartContactRendererType<T> = (uuid: UUIDStringType) => T | string;
export type StringRendererType<T> = (
  id: string,
  i18n: LocalizerType,
  components?: ReplacementValuesType<T | string | number>
) => T | string;

export type RenderOptionsType<T> = {
  from?: UUIDStringType;
  i18n: LocalizerType;
  ourACI?: UUIDStringType;
  ourPNI?: UUIDStringType;
  renderContact: SmartContactRendererType<T>;
  renderString: StringRendererType<T>;
};

const AccessControlEnum = Proto.AccessControl.AccessRequired;
const RoleEnum = Proto.Member.Role;

export type RenderChangeResultType<T> = ReadonlyArray<
  Readonly<{
    detail: GroupV2ChangeDetailType;
    text: T | string;

    // Used to differentiate between the multiple texts produced by
    // 'admin-approval-bounce'
    isLastText: boolean;
  }>
>;

export function renderChange<T>(
  change: GroupV2ChangeType,
  options: RenderOptionsType<T>
): RenderChangeResultType<T> {
  const { details, from } = change;

  return details.flatMap((detail: GroupV2ChangeDetailType) => {
    const texts = renderChangeDetail<T>(detail, {
      ...options,
      from,
    });

    if (!Array.isArray(texts)) {
      return { detail, isLastText: true, text: texts };
    }

    return texts.map((text, index) => {
      const isLastText = index === texts.length - 1;
      return { detail, isLastText, text };
    });
  });
}

export function renderChangeDetail<T>(
  detail: GroupV2ChangeDetailType,
  options: RenderOptionsType<T>
): T | string | ReadonlyArray<T | string> {
  const {
    from,
    i18n: localizer,
    ourACI,
    ourPNI,
    renderContact,
    renderString,
  } = options;

  function i18n(
    id: string,
    components?: ReplacementValuesType<T | number | string>
  ) {
    return renderString(id, localizer, components);
  }

  const isOurUuid = (uuid?: UUIDStringType): boolean => {
    if (!uuid) {
      return false;
    }
    return Boolean((ourACI && uuid === ourACI) || (ourPNI && uuid === ourPNI));
  };
  const fromYou = isOurUuid(from);

  if (detail.type === 'create') {
    if (fromYou) {
      return i18n('icu:GroupV2--create--you');
    }
    if (from) {
      return i18n('icu:GroupV2--create--other', {
        memberName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--create--unknown');
  }
  if (detail.type === 'title') {
    const { newTitle } = detail;

    if (newTitle) {
      if (fromYou) {
        return i18n('icu:GroupV2--title--change--you', { newTitle });
      }
      if (from) {
        return i18n('icu:GroupV2--title--change--other', {
          memberName: renderContact(from),
          newTitle,
        });
      }
      return i18n('icu:GroupV2--title--change--unknown', {
        newTitle,
      });
    }
    if (fromYou) {
      return i18n('icu:GroupV2--title--remove--you');
    }
    if (from) {
      return i18n('icu:GroupV2--title--remove--other', {
        memberName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--title--remove--unknown');
  }
  if (detail.type === 'avatar') {
    if (detail.removed) {
      if (fromYou) {
        return i18n('icu:GroupV2--avatar--remove--you');
      }
      if (from) {
        return i18n('icu:GroupV2--avatar--remove--other', {
          memberName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--avatar--remove--unknown');
    }
    if (fromYou) {
      return i18n('icu:GroupV2--avatar--change--you');
    }
    if (from) {
      return i18n('icu:GroupV2--avatar--change--other', {
        memberName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--avatar--change--unknown');
  }
  if (detail.type === 'access-attributes') {
    const { newPrivilege } = detail;

    if (newPrivilege === AccessControlEnum.ADMINISTRATOR) {
      if (fromYou) {
        return i18n('icu:GroupV2--access-attributes--admins--you');
      }
      if (from) {
        return i18n('icu:GroupV2--access-attributes--admins--other', {
          adminName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--access-attributes--admins--unknown');
    }
    if (newPrivilege === AccessControlEnum.MEMBER) {
      if (fromYou) {
        return i18n('icu:GroupV2--access-attributes--all--you');
      }
      if (from) {
        return i18n('icu:GroupV2--access-attributes--all--other', {
          adminName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--access-attributes--all--unknown');
    }
    log.warn(
      `access-attributes change type, privilege ${newPrivilege} is unknown`
    );
    return '';
  }
  if (detail.type === 'access-members') {
    const { newPrivilege } = detail;

    if (newPrivilege === AccessControlEnum.ADMINISTRATOR) {
      if (fromYou) {
        return i18n('icu:GroupV2--access-members--admins--you');
      }
      if (from) {
        return i18n('icu:GroupV2--access-members--admins--other', {
          adminName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--access-members--admins--unknown');
    }
    if (newPrivilege === AccessControlEnum.MEMBER) {
      if (fromYou) {
        return i18n('icu:GroupV2--access-members--all--you');
      }
      if (from) {
        return i18n('icu:GroupV2--access-members--all--other', {
          adminName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--access-members--all--unknown');
    }
    log.warn(
      `access-members change type, privilege ${newPrivilege} is unknown`
    );
    return '';
  }
  if (detail.type === 'access-invite-link') {
    const { newPrivilege } = detail;

    if (newPrivilege === AccessControlEnum.ADMINISTRATOR) {
      if (fromYou) {
        return i18n('icu:GroupV2--access-invite-link--enabled--you');
      }
      if (from) {
        return i18n(
          'icu:GroupV2--access-invite-link--enabled--other',

          { adminName: renderContact(from) }
        );
      }
      return i18n('icu:GroupV2--access-invite-link--enabled--unknown');
    }
    if (newPrivilege === AccessControlEnum.ANY) {
      if (fromYou) {
        return i18n('icu:GroupV2--access-invite-link--disabled--you');
      }
      if (from) {
        return i18n(
          'icu:GroupV2--access-invite-link--disabled--other',

          { adminName: renderContact(from) }
        );
      }
      return i18n('icu:GroupV2--access-invite-link--disabled--unknown');
    }
    log.warn(
      `access-invite-link change type, privilege ${newPrivilege} is unknown`
    );
    return '';
  }
  if (detail.type === 'member-add') {
    const { uuid } = detail;
    const weAreJoiner = isOurUuid(uuid);

    if (weAreJoiner) {
      if (fromYou) {
        return i18n('icu:GroupV2--member-add--you--you');
      }
      if (from) {
        return i18n('icu:GroupV2--member-add--you--other', {
          memberName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--member-add--you--unknown');
    }
    if (fromYou) {
      return i18n('icu:GroupV2--member-add--other--you', {
        memberName: renderContact(uuid),
      });
    }
    if (from) {
      return i18n('icu:GroupV2--member-add--other--other', {
        adderName: renderContact(from),
        addeeName: renderContact(uuid),
      });
    }
    return i18n('icu:GroupV2--member-add--other--unknown', {
      memberName: renderContact(uuid),
    });
  }
  if (detail.type === 'member-add-from-invite') {
    const { uuid, inviter } = detail;
    const weAreJoiner = isOurUuid(uuid);
    const weAreInviter = isOurUuid(inviter);

    if (!from || from !== uuid) {
      if (weAreJoiner) {
        // They can't be the same, no fromYou check here
        if (from) {
          return i18n('icu:GroupV2--member-add--you--other', {
            memberName: renderContact(from),
          });
        }
        return i18n('icu:GroupV2--member-add--you--unknown');
      }

      if (fromYou) {
        return i18n('icu:GroupV2--member-add--invited--you', {
          inviteeName: renderContact(uuid),
        });
      }
      if (from) {
        return i18n('icu:GroupV2--member-add--invited--other', {
          memberName: renderContact(from),
          inviteeName: renderContact(uuid),
        });
      }
      return i18n('icu:GroupV2--member-add--invited--unknown', {
        inviteeName: renderContact(uuid),
      });
    }

    if (weAreJoiner) {
      if (inviter) {
        return i18n('icu:GroupV2--member-add--from-invite--you', {
          inviterName: renderContact(inviter),
        });
      }
      return i18n('icu:GroupV2--member-add--from-invite--you-no-from');
    }
    if (weAreInviter) {
      return i18n('icu:GroupV2--member-add--from-invite--from-you', {
        inviteeName: renderContact(uuid),
      });
    }
    if (inviter) {
      return i18n('icu:GroupV2--member-add--from-invite--other', {
        inviteeName: renderContact(uuid),
        inviterName: renderContact(inviter),
      });
    }
    return i18n(
      'icu:GroupV2--member-add--from-invite--other-no-from',

      {
        inviteeName: renderContact(uuid),
      }
    );
  }
  if (detail.type === 'member-add-from-link') {
    const { uuid } = detail;

    if (fromYou && isOurUuid(uuid)) {
      return i18n('icu:GroupV2--member-add-from-link--you--you');
    }
    if (from && uuid === from) {
      return i18n('icu:GroupV2--member-add-from-link--other', {
        memberName: renderContact(from),
      });
    }

    // Note: this shouldn't happen, because we only capture 'add-from-link' status
    //   from group change events, which always have a sender.
    log.warn('member-add-from-link change type; we have no from!');
    return i18n('icu:GroupV2--member-add--other--unknown', {
      memberName: renderContact(uuid),
    });
  }
  if (detail.type === 'member-add-from-admin-approval') {
    const { uuid } = detail;
    const weAreJoiner = isOurUuid(uuid);

    if (weAreJoiner) {
      if (from) {
        return i18n(
          'icu:GroupV2--member-add-from-admin-approval--you--other',

          { adminName: renderContact(from) }
        );
      }

      // Note: this shouldn't happen, because we only capture 'add-from-admin-approval'
      //   status from group change events, which always have a sender.
      log.warn(
        'member-add-from-admin-approval change type; we have no from, and we are joiner!'
      );
      return i18n('icu:GroupV2--member-add-from-admin-approval--you--unknown');
    }

    if (fromYou) {
      return i18n(
        'icu:GroupV2--member-add-from-admin-approval--other--you',

        { joinerName: renderContact(uuid) }
      );
    }
    if (from) {
      return i18n(
        'icu:GroupV2--member-add-from-admin-approval--other--other',

        {
          adminName: renderContact(from),
          joinerName: renderContact(uuid),
        }
      );
    }

    // Note: this shouldn't happen, because we only capture 'add-from-admin-approval'
    //   status from group change events, which always have a sender.
    log.warn('member-add-from-admin-approval change type; we have no from');
    return i18n(
      'icu:GroupV2--member-add-from-admin-approval--other--unknown',

      { joinerName: renderContact(uuid) }
    );
  }
  if (detail.type === 'member-remove') {
    const { uuid } = detail;
    const weAreLeaver = isOurUuid(uuid);

    if (weAreLeaver) {
      if (fromYou) {
        return i18n('icu:GroupV2--member-remove--you--you');
      }
      if (from) {
        return i18n('icu:GroupV2--member-remove--you--other', {
          adminName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--member-remove--you--unknown');
    }

    if (fromYou) {
      return i18n('icu:GroupV2--member-remove--other--you', {
        memberName: renderContact(uuid),
      });
    }
    if (from && from === uuid) {
      return i18n('icu:GroupV2--member-remove--other--self', {
        memberName: renderContact(from),
      });
    }
    if (from) {
      return i18n('icu:GroupV2--member-remove--other--other', {
        adminName: renderContact(from),
        memberName: renderContact(uuid),
      });
    }
    return i18n('icu:GroupV2--member-remove--other--unknown', {
      memberName: renderContact(uuid),
    });
  }
  if (detail.type === 'member-privilege') {
    const { uuid, newPrivilege } = detail;
    const weAreMember = isOurUuid(uuid);

    if (newPrivilege === RoleEnum.ADMINISTRATOR) {
      if (weAreMember) {
        if (from) {
          return i18n(
            'icu:GroupV2--member-privilege--promote--you--other',

            { adminName: renderContact(from) }
          );
        }

        return i18n('icu:GroupV2--member-privilege--promote--you--unknown');
      }

      if (fromYou) {
        return i18n('icu:GroupV2--member-privilege--promote--other--you', {
          memberName: renderContact(uuid),
        });
      }
      if (from) {
        return i18n('icu:GroupV2--member-privilege--promote--other--other', {
          adminName: renderContact(from),
          memberName: renderContact(uuid),
        });
      }
      return i18n('icu:GroupV2--member-privilege--promote--other--unknown', {
        memberName: renderContact(uuid),
      });
    }
    if (newPrivilege === RoleEnum.DEFAULT) {
      if (weAreMember) {
        if (from) {
          return i18n('icu:GroupV2--member-privilege--demote--you--other', {
            adminName: renderContact(from),
          });
        }
        return i18n('icu:GroupV2--member-privilege--demote--you--unknown');
      }

      if (fromYou) {
        return i18n('icu:GroupV2--member-privilege--demote--other--you', {
          memberName: renderContact(uuid),
        });
      }
      if (from) {
        return i18n(
          'icu:GroupV2--member-privilege--demote--other--other',

          {
            adminName: renderContact(from),
            memberName: renderContact(uuid),
          }
        );
      }
      return i18n(
        'icu:GroupV2--member-privilege--demote--other--unknown',

        { memberName: renderContact(uuid) }
      );
    }
    log.warn(
      `member-privilege change type, privilege ${newPrivilege} is unknown`
    );
    return '';
  }
  if (detail.type === 'pending-add-one') {
    const { uuid } = detail;
    const weAreInvited = isOurUuid(uuid);
    if (weAreInvited) {
      if (from) {
        return i18n('icu:GroupV2--pending-add--one--you--other', {
          memberName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--pending-add--one--you--unknown');
    }
    if (fromYou) {
      return i18n('icu:GroupV2--pending-add--one--other--you', {
        inviteeName: renderContact(uuid),
      });
    }
    if (from) {
      return i18n('icu:GroupV2--pending-add--one--other--other', {
        memberName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--pending-add--one--other--unknown');
  }
  if (detail.type === 'pending-add-many') {
    const { count } = detail;

    if (fromYou) {
      return i18n('icu:GroupV2--pending-add--many--you', {
        count,
      });
    }
    if (from) {
      return i18n('icu:GroupV2--pending-add--many--other', {
        memberName: renderContact(from),
        count,
      });
    }
    return i18n('icu:GroupV2--pending-add--many--unknown', {
      count,
    });
  }
  if (detail.type === 'pending-remove-one') {
    const { inviter, uuid } = detail;
    const weAreInviter = isOurUuid(inviter);
    const weAreInvited = isOurUuid(uuid);
    const sentByInvited = Boolean(from && from === uuid);
    const sentByInviter = Boolean(from && inviter && from === inviter);

    if (weAreInviter) {
      if (sentByInvited) {
        return i18n('icu:GroupV2--pending-remove--decline--you', {
          inviteeName: renderContact(uuid),
        });
      }
      if (fromYou) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from-you--one--you',

          { inviteeName: renderContact(uuid) }
        );
      }
      if (from) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from-you--one--other',

          {
            adminName: renderContact(from),
            inviteeName: renderContact(uuid),
          }
        );
      }
      return i18n(
        'icu:GroupV2--pending-remove--revoke-invite-from-you--one--unknown',

        { inviteeName: renderContact(uuid) }
      );
    }
    if (sentByInvited) {
      if (fromYou) {
        return i18n('icu:GroupV2--pending-remove--decline--from-you');
      }
      if (inviter) {
        return i18n('icu:GroupV2--pending-remove--decline--other', {
          memberName: renderContact(inviter),
        });
      }
      return i18n('icu:GroupV2--pending-remove--decline--unknown');
    }
    if (inviter && sentByInviter) {
      if (weAreInvited) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-own--to-you',

          { inviterName: renderContact(inviter) }
        );
      }
      return i18n(
        'icu:GroupV2--pending-remove--revoke-own--unknown',

        { inviterName: renderContact(inviter) }
      );
    }
    if (inviter) {
      if (fromYou) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from--one--you',

          { memberName: renderContact(inviter) }
        );
      }
      if (from) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from--one--other',

          {
            adminName: renderContact(from),
            memberName: renderContact(inviter),
          }
        );
      }
      return i18n(
        'icu:GroupV2--pending-remove--revoke-invite-from--one--unknown',

        { memberName: renderContact(inviter) }
      );
    }
    if (fromYou) {
      return i18n('icu:GroupV2--pending-remove--revoke--one--you');
    }
    if (from) {
      return i18n('icu:GroupV2--pending-remove--revoke--one--other', {
        memberName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--pending-remove--revoke--one--unknown');
  }
  if (detail.type === 'pending-remove-many') {
    const { count, inviter } = detail;
    const weAreInviter = isOurUuid(inviter);

    if (weAreInviter) {
      if (fromYou) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from-you--many--you',

          { count }
        );
      }
      if (from) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from-you--many--other',

          {
            adminName: renderContact(from),
            count,
          }
        );
      }
      return i18n(
        'icu:GroupV2--pending-remove--revoke-invite-from-you--many--unknown',

        { count }
      );
    }
    if (inviter) {
      if (fromYou) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from--many--you',

          {
            count,
            memberName: renderContact(inviter),
          }
        );
      }
      if (from) {
        return i18n(
          'icu:GroupV2--pending-remove--revoke-invite-from--many--other',

          {
            adminName: renderContact(from),
            count,
            memberName: renderContact(inviter),
          }
        );
      }
      return i18n(
        'icu:GroupV2--pending-remove--revoke-invite-from--many--unknown',

        {
          count,
          memberName: renderContact(inviter),
        }
      );
    }
    if (fromYou) {
      return i18n('icu:GroupV2--pending-remove--revoke--many--you', {
        count,
      });
    }
    if (from) {
      return i18n(
        'icu:GroupV2--pending-remove--revoke--many--other',

        {
          memberName: renderContact(from),
          count,
        }
      );
    }
    return i18n(
      'icu:GroupV2--pending-remove--revoke--many--unknown',

      { count }
    );
  }
  if (detail.type === 'admin-approval-add-one') {
    const { uuid } = detail;
    const weAreJoiner = isOurUuid(uuid);

    if (weAreJoiner) {
      return i18n('icu:GroupV2--admin-approval-add-one--you');
    }
    return i18n('icu:GroupV2--admin-approval-add-one--other', {
      joinerName: renderContact(uuid),
    });
  }
  if (detail.type === 'admin-approval-remove-one') {
    const { uuid } = detail;
    const weAreJoiner = isOurUuid(uuid);

    if (weAreJoiner) {
      if (fromYou) {
        return i18n('icu:GroupV2--admin-approval-remove-one--you--you');
      }
      return i18n('icu:GroupV2--admin-approval-remove-one--you--unknown');
    }

    if (fromYou) {
      return i18n(
        'icu:GroupV2--admin-approval-remove-one--other--you',

        { joinerName: renderContact(uuid) }
      );
    }
    if (from && from === uuid) {
      return i18n(
        'icu:GroupV2--admin-approval-remove-one--other--own',

        { joinerName: renderContact(uuid) }
      );
    }
    if (from) {
      return i18n(
        'icu:GroupV2--admin-approval-remove-one--other--other',

        {
          adminName: renderContact(from),
          joinerName: renderContact(uuid),
        }
      );
    }

    // We default to the user canceling their request, because it is far more likely that
    //   if an admin does the denial, we'll get a change event from them.
    return i18n(
      'icu:GroupV2--admin-approval-remove-one--other--own',

      { joinerName: renderContact(uuid) }
    );
  }
  if (detail.type === 'admin-approval-bounce') {
    const { uuid, times, isApprovalPending } = detail;

    let firstMessage: T | string;
    if (times === 1) {
      firstMessage = i18n('icu:GroupV2--admin-approval-bounce--one', {
        joinerName: renderContact(uuid),
      });
    } else {
      firstMessage = i18n('icu:GroupV2--admin-approval-bounce', {
        joinerName: renderContact(uuid),
        numberOfRequests: times,
      });
    }

    if (!isApprovalPending) {
      return firstMessage;
    }

    const secondMessage = renderChangeDetail(
      {
        type: 'admin-approval-add-one',
        uuid,
      },
      options
    );

    return [
      firstMessage,
      ...(Array.isArray(secondMessage) ? secondMessage : [secondMessage]),
    ];
  }
  if (detail.type === 'group-link-add') {
    const { privilege } = detail;

    if (privilege === AccessControlEnum.ADMINISTRATOR) {
      if (fromYou) {
        return i18n('icu:GroupV2--group-link-add--enabled--you');
      }
      if (from) {
        return i18n('icu:GroupV2--group-link-add--enabled--other', {
          adminName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--group-link-add--enabled--unknown');
    }
    if (privilege === AccessControlEnum.ANY) {
      if (fromYou) {
        return i18n('icu:GroupV2--group-link-add--disabled--you');
      }
      if (from) {
        return i18n('icu:GroupV2--group-link-add--disabled--other', {
          adminName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--group-link-add--disabled--unknown');
    }
    log.warn(`group-link-add change type, privilege ${privilege} is unknown`);
    return '';
  }
  if (detail.type === 'group-link-reset') {
    if (fromYou) {
      return i18n('icu:GroupV2--group-link-reset--you');
    }
    if (from) {
      return i18n('icu:GroupV2--group-link-reset--other', {
        adminName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--group-link-reset--unknown');
  }
  if (detail.type === 'group-link-remove') {
    if (fromYou) {
      return i18n('icu:GroupV2--group-link-remove--you');
    }
    if (from) {
      return i18n('icu:GroupV2--group-link-remove--other', {
        adminName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--group-link-remove--unknown');
  }
  if (detail.type === 'description') {
    if (detail.removed) {
      if (fromYou) {
        return i18n('icu:GroupV2--description--remove--you');
      }
      if (from) {
        return i18n('icu:GroupV2--description--remove--other', {
          memberName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--description--remove--unknown');
    }

    if (fromYou) {
      return i18n('icu:GroupV2--description--change--you');
    }
    if (from) {
      return i18n('icu:GroupV2--description--change--other', {
        memberName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--description--change--unknown');
  }
  if (detail.type === 'announcements-only') {
    if (detail.announcementsOnly) {
      if (fromYou) {
        return i18n('icu:GroupV2--announcements--admin--you');
      }
      if (from) {
        return i18n('icu:GroupV2--announcements--admin--other', {
          memberName: renderContact(from),
        });
      }
      return i18n('icu:GroupV2--announcements--admin--unknown');
    }

    if (fromYou) {
      return i18n('icu:GroupV2--announcements--member--you');
    }
    if (from) {
      return i18n('icu:GroupV2--announcements--member--other', {
        memberName: renderContact(from),
      });
    }
    return i18n('icu:GroupV2--announcements--member--unknown');
  }
  if (detail.type === 'summary') {
    return i18n('icu:GroupV2--summary');
  }

  throw missingCaseError(detail);
}