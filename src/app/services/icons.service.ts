import { Injectable } from '@angular/core';
import {
  faUser,faUsers,faQuestion,faBullseye,faSitemap,faEnvelope,
  faUserCog,faHandsHelping,faGlobeEurope,faRoad,faMap,faSignOutAlt,
  faSignInAlt,faList,faLock,faBuilding,faClock,faExclamationTriangle,
  faEdit,faChartPie,faSort,faFileAlt,faSlidersH,faGripHorizontal,faBook,
  faPeopleCarry,faGraduationCap,faInfo,faSignal,faHashtag,faCalendar,
  faHourglassHalf,faTools,faVideo,faChevronDown,faChevronUp,faHome, faPlus, faEye,
  faArrowRight, faArrowLeft, faTimes, faTrashAlt, faWrench, faThList, faTasks, faHistory, faIndent,
  faTag,faStar,faInfoCircle, faCircle as faCircleSolid, faDownload, faEuroSign, faGlobe, faQrcode,
  faCopy,faThermometerHalf,faSyncAlt,faBirthdayCake,faWind,faFistRaised,faComments,faUserCheck,
  faChevronRight,faRedoAlt,faFileExcel, faMapPin,faExchangeAlt,faSign,faExclamation,faStreetView,
  faRuler, faHandshake,faUserFriends,faUserShield,faMeh,faDoorOpen,faGlasses,faGopuram,faHandHoldingHeart,
  faObjectGroup,faUniversalAccess,faPuzzlePiece,faShareAlt,faPeopleArrows,faShippingFast,faSmileBeam,
  faGavel,faCommentDots,faDog, faAlignJustify,faHeart,faSeedling,faAtom,faHandHolding, faCalendarDay,
  faChevronLeft,faVideoSlash,faMicrophone,faThumbsUp, faArrowDown,faArrowUp,faChild, faSlash, faArchive,
  faMobileAlt,faUndoAlt,faPen,faPenAlt, faAt, faSchool, faRunning, faCog, faCogs, faCheck, faSave, faPrint,
  faEllipsisH,faEllipsisV,faPause,faPlay, faChartBar, faTimesCircle, faChartLine, faChartArea, faCloudUploadAlt,
  faClone,faCloudDownloadAlt, faImage, faMinusCircle, faPlusCircle, faSquare,faSquareFull,faArrowsAlt,faCheckSquare,
  faHandPointDown,faHandPointUp,faExpandAlt,faCompressAlt,faIcons,faSuitcase,faCameraRetro,faGrinTongue,faBan,faMinus,
  faStop,faPersonPraying,faLandmark,faCheckCircle,faCommentSlash,faComment,faPaperPlane,faUserGraduate,faTree,faCartPlus,
  faBolt,faCode,faAward,faCreditCard,faCoins,faCrow,faStepBackward,faFastBackward, faCaretDown,faBars, faHandPointRight, faFilter,
  faSearch,faThumbsDown,faExternalLinkAlt,faReply,faUserNinja,faAddressCard,faPaperclip, faTh, faInfinity, faLink, faDatabase,
  faFileImport,faFileExport,faLightbulb,faUsersCog,faLevelUp,faFolderPlus,faMicrophoneAlt,faMicrophoneAltSlash,faGift

} from '@fortawesome/free-solid-svg-icons';
import {
  faCircle,faStar as faStarOutline,

} from '@fortawesome/free-regular-svg-icons';

import {
  faLinkedin,faFacebook,faInstagram,faTwitter,faYoutube,faWhatsapp,faTiktok,
  faTelegram,faSignalMessenger,faXTwitter,faVimeo
} from '@fortawesome/free-brands-svg-icons'

import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class IconsService {
  icons:any = {
    faAddressCard,
    faAlignJustify,
    faArchive,
    faArrowDown,
    faArrowLeft,
    faArrowRight,
    faArrowUp,
    faArrowsAlt,
    faAt,
    faAtom,
    faAward,
    faBan,
    faBars,
    faBirthdayCake,
    faBolt,
    faBook,
    faBuilding,
    faBullseye,
    faCalendar,
    faCalendarDay,
    faCameraRetro,
    faCaretDown,
    faCartPlus,
    faChartArea,
    faChartBar,
    faChartLine,
    faChartPie,
    faChevronDown,
    faChevronLeft,
    faChevronRight,
    faChevronUp,
    faCheck,
    faCheckCircle,
    faCheckSquare,
    faChild,
    faCircle,
    faCircleSolid,
    faCloudDownloadAlt,
    faCloudUploadAlt,
    faClock,
    faClone,
    faCode,
    faCog,
    faCogs,
    faCoins,
    faComment,
    faComments,
    faCommentSlash,
    faCommentDots,
    faCompressAlt,
    faCopy,
    faCreditCard,
    faCrow,
    faDatabase,
    faDog,
    faDownload,
    faDoorOpen,
    faEdit,
    faEllipsisH,
    faEllipsisV,
    faEnvelope,
    faExclamation,
    faExclamationTriangle,
    faExternalLinkAlt,
    faEuroSign,
    faExchangeAlt,
    faExpandAlt,
    faEye,
    faFastBackward,
    faFileAlt,
    faFileExcel,
    faFileExport,
    faFileImport,
    faFilter,
    faFistRaised,
    faFolderPlus,
    faGavel,
    faGift,
    faGlasses,
    faGlobe,
    faGlobeEurope,
    faGopuram,
    faGraduationCap,
    faGrinTongue,
    faGripHorizontal,
    faHandHolding,
    faHandHoldingHeart,
    faHandPointDown,
    faHandPointRight,
    faHandPointUp,
    faHandsHelping,
    faHandshake,
    faHashtag,
    faHeart,
    faHistory,
    faHome,
    faHourglassHalf,
    faIcons,
    faImage,
    faIndent,
    faInfinity,
    faInfo,
    faInfoCircle,
    faLandmark,
    faLevelUp,
    faLightbulb,
    faList,
    faLock,
    faMap,
    faMapPin,
    faMeh,
    faMicrophone,
    faMicrophoneAlt,
    faMicrophoneAltSlash,
    faMinus,
    faMinusCircle,
    faMobileAlt,
    faObjectGroup,
    faPaperclip,
    faPaperPlane,
    faPause,
    faPenAlt,
    faPen,
    faPeopleArrows,
    faPeopleCarry,
    faPersonPraying,
    faPlay,
    faPlus,
    faPlusCircle,
    faPrint,
    faPuzzlePiece,
    faQrcode,
    faQuestion,
    faRedoAlt,
    faReply,
    faRoad,
    faRuler,
    faRunning,
    faSave,
    faSchool,
    faSearch,
    faSeedling,
    faShareAlt,
    faShippingFast,
    faSign,
    faSignal,
    faSignInAlt,
    faSignOutAlt,
    faSitemap,
    faSlash,
    faSlidersH,
    faSmileBeam,
    faSort,
    faSquare,
    faSquareFull,
    faStepBackward,
    faStar,
    faStarOutline,
    faStop,
    faStreetView,
    faSuitcase,
    faSyncAlt,
    faTag,
    faTasks,
    faTh,
    faThermometerHalf,
    faThList,
    faThumbsDown,
    faThumbsUp,
    faTimes,
    faTimesCircle,
    faTrashAlt,
    faTools,
    faTree,
    faUndoAlt,
    faUniversalAccess,
    faUser,
    faUserCheck,
    faUserCog,
    faUserFriends,
    faUserGraduate,
    faUserNinja,
    faUsers,
    faUsersCog,
    faUserShield,
    faVideo,
    faVideoSlash,
    faVimeo,
    faWind,
    faWrench,
    faLink,
    faLinkedin,
    faFacebook,
    faInstagram,
    faTwitter,
    faYoutube,
    faWhatsapp,
    faTiktok,
    faTelegram,
    faSignalMessenger,
    faXTwitter
  };
  
  constructor(
  ) { }

  public get(name:string){
    return this.icons[name];
  }

  get all(){
    return this.icons;
  }

}
